const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// POST /api/devis-simple — Sauvegarder un devis simplifié
router.post('/', async (req, res) => {
  try {
    const {
      nomClient,
      dateEvenement,
      nombreCouverts,
      margeCible,
      autresFrais,
      autresFraisLibelle,
      plats // [{ ficheTechniqueId, quantite }]
    } = req.body;

    if (!nomClient || !dateEvenement || !nombreCouverts || !plats || !Array.isArray(plats) || plats.length === 0) {
      return res.status(400).json({ error: "Champs obligatoires manquants : nomClient, dateEvenement, nombreCouverts, plats." });
    }

    const nc = parseInt(nombreCouverts);
    const marge = parseFloat(margeCible) || 65;
    const frais = parseFloat(autresFrais) || 0;

    if (nc <= 0) return res.status(400).json({ error: "Le nombre de couverts doit être supérieur à 0." });

    // Calculer le CA previsionnel base sur la marge cible
    // Recuperer toutes les recettes en une seule requete (eviter N+1)
    const ficheTechniqueIds = plats.map(p => p.ficheTechniqueId).filter(Boolean);
    const fichesMap = {};
    if (ficheTechniqueIds.length > 0) {
      const fiches = await prisma.ficheTechnique.findMany({
        where: { id: { in: ficheTechniqueIds } },
        include: { lignes: { include: { article: true } } }
      });
      fiches.forEach(f => { fichesMap[f.id] = f; });
    }
    let coutMatiere = 0;
    for (const p of plats) {
      const fiche = fichesMap[p.ficheTechniqueId];
      if (!fiche) continue;
      let coutFiche = 0;
      fiche.lignes.forEach(l => {
        coutFiche += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
      });
      coutMatiere += coutFiche * parseInt(p.quantite || 1);
    }

    const coutTotal = coutMatiere + frais;
    // CA conseillé = coutTotal / (1 - marge/100)
    const caConseille = marge < 100 ? Math.round((coutTotal / (1 - marge / 100)) * 100) / 100 : 0;

    // Créer l'événement en base avec une structure simplifiée
    const evenement = await prisma.$transaction(async (tx) => {
      const ev = await tx.evenementDevis.create({
        data: {
          nomClient,
          dateEvenement: new Date(dateEvenement),
          chiffreAffairesSaisi: caConseille,
          chiffreAffairesSaisiPrevu: caConseille,
          status: 'Brouillon'
        }
      });

      // Créer un lot unique "Menu" avec toutes les recettes
      const lot = await tx.devisLot.create({
        data: {
          evenementDevisId: ev.id,
          nom: 'Menu'
        }
      });

      for (const p of plats) {
        await tx.devisLigneProduit.create({
          data: {
            devisLotId: lot.id,
            ficheTechniqueId: p.ficheTechniqueId,
            quantitePrevue: parseInt(p.quantite || 1),
            prixUnitaireFige: 0
          }
        });
      }

      // Frais externes si présents
      if (frais > 0 && autresFraisLibelle) {
        await tx.fraisExterne.create({
          data: {
            evenementDevisId: ev.id,
            categorie: autresFraisLibelle || 'Autres frais',
            montantHT: frais
          }
        });
      }

      return ev;
    });

    return res.status(201).json({
      message: "Devis créé avec succès.",
      id: evenement.id,
      coutMatiere: Math.round(coutMatiere * 100) / 100,
      coutTotal: Math.round(coutTotal * 100) / 100,
      caConseille,
      nombreCouverts: nc,
      margeCible: marge
    });

  } catch (error) {
    console.error("Erreur devis-simple :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// GET /api/devis-simple — Liste des devis sauvegardés
router.get('/', async (req, res) => {
  try {
    const devis = await prisma.evenementDevis.findMany({
      include: {
        devisLots: {
          include: {
            lignesProduit: {
              include: {
                ficheTechnique: {
                  include: { lignes: { include: { article: true } } }
                }
              }
            }
          }
        },
        fraisExternes: true
      },
      orderBy: { creeLe: 'desc' }
    });

    return res.json(devis);
  } catch (error) {
    console.error("Erreur liste devis :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// DELETE /api/devis-simple/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ev = await prisma.evenementDevis.findUnique({ where: { id } });
    if (!ev) return res.status(404).json({ error: "Devis non trouvé." });
    await prisma.evenementDevis.delete({ where: { id } });
    return res.json({ message: "Devis supprimé." });
  } catch (error) {
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

module.exports = router;
