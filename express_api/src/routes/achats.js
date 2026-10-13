const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. LIRE TOUS LES ACHATS FACTURÉS
router.get('/', async (req, res) => {
  try {
    const achats = await prisma.achatFacture.findMany({
      include: {
        article: true
      },
      orderBy: { creeLe: 'desc' }
    });
    return res.json(achats);
  } catch (error) {
    console.error("Erreur lors de la récupération des achats facturés :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 1.5. BILAN RSE DU MOIS EN COURS (EGAlim)
router.get('/rse/bilan', async (req, res) => {
  try {
    const now = new Date();
    // Mois courant du 1er au dernier jour
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Parcourir toutes les factures enregistrées sur le mois
    const factures = await prisma.facture.findMany({
      where: {
        dateFacture: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        lignes: {
          include: {
            article: true
          }
        }
      }
    });

    // 2. Parcourir également les achats orphelins
    const achatsOrphelins = await prisma.achatFacture.findMany({
      where: {
        factureId: null,
        creeLe: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        article: true
      }
    });

    let totalHT = 0.0;
    const classifications = { Bio: 0, Local: 0, Labellise: 0, Standard: 0 };
    const familles = {};

    const ajouterLigne = (a) => {
      const prix = a.prixTotalLigne || 0;
      totalHT += prix;

      // Classification
      const classif = a.article?.classificationRSE;
      if (classif === 'Bio') classifications.Bio += prix;
      else if (classif === 'Local') classifications.Local += prix;
      else if (classif === 'Labellisé (AOP/AOC...)' || classif === 'Labellisé') classifications.Labellise += prix;
      else classifications.Standard += prix;

      // Famille
      const famille = a.article?.familleRSE || 'Non spécifié';
      if (!familles[famille]) {
        familles[famille] = { total: 0, Bio: 0, Local: 0, Labellise: 0, Standard: 0 };
      }
      familles[famille].total += prix;

      if (classif === 'Bio') familles[famille].Bio += prix;
      else if (classif === 'Local') familles[famille].Local += prix;
      else if (classif === 'Labellisé (AOP/AOC...)' || classif === 'Labellisé') familles[famille].Labellise += prix;
      else familles[famille].Standard += prix;
    };

    factures.forEach(f => {
      f.lignes.forEach(ajouterLigne);
    });

    achatsOrphelins.forEach(ajouterLigne);

    const calculatePct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;

    const response = {
      mois: startOfMonth.toISOString().substring(0, 7), // YYYY-MM
      totalHT,
      repartitionGlobale: {
        Bio: { montant: classifications.Bio, pct: calculatePct(classifications.Bio, totalHT) },
        Local: { montant: classifications.Local, pct: calculatePct(classifications.Local, totalHT) },
        Labellise: { montant: classifications.Labellise, pct: calculatePct(classifications.Labellise, totalHT) },
        Standard: { montant: classifications.Standard, pct: calculatePct(classifications.Standard, totalHT) }
      },
      repartitionParFamille: Object.keys(familles).map(f => {
        const ft = familles[f].total;
        return {
          nom: f,
          totalHT: ft,
          pctDuTotalMois: calculatePct(ft, totalHT),
          Bio: { montant: familles[f].Bio, pct: calculatePct(familles[f].Bio, ft) },
          Local: { montant: familles[f].Local, pct: calculatePct(familles[f].Local, ft) },
          Labellise: { montant: familles[f].Labellise, pct: calculatePct(familles[f].Labellise, ft) },
          Standard: { montant: familles[f].Standard, pct: calculatePct(familles[f].Standard, ft) }
        };
      }).sort((a, b) => b.totalHT - a.totalHT)
    };

    return res.json(response);

  } catch (error) {
    console.error("Erreur lors de la génération du bilan RSE :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. LIRE LES DÉTAILS D'UN ACHAT SPÉCIFIQUE
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const achat = await prisma.achatFacture.findUnique({
      where: { id },
      include: {
        article: true
      }
    });

    if (!achat) {
      return res.status(404).json({ error: "Ligne d'achat facturé non trouvée." });
    }
    return res.json(achat);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'achat :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 3. ENREGISTRER UNE FACTURE (MULTI-PRODUITS) ET METTRE À JOUR LES STOCKS & PRIX
router.post('/', async (req, res) => {
  try {
    let { numeroFacture, dateFacture, fournisseur, lignes } = req.body;

    // Support legacy format for backwards compatibility
    if (!lignes && req.body.articleId) {
      lignes = [{
        articleId: req.body.articleId,
        prixTotalLigne: req.body.prixTotalLigne,
        quantiteAchetee: req.body.quantiteAchetee,
        uniteAchat: req.body.uniteAchat,
        poidsReelUniteBase: req.body.poidsReelUniteBase,
        achatSpecifique: req.body.achatSpecifique,
        evenementDevisId: req.body.evenementDevisId
      }];
    }

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: "Le tableau 'lignes' est requis et ne doit pas être vide." });
    }

    // Validation de chaque ligne
    for (let i = 0; i < lignes.length; i++) {
      const { articleId, prixTotalLigne, quantiteAchetee, uniteAchat, poidsReelUniteBase } = lignes[i];
      if (!articleId || prixTotalLigne === undefined || quantiteAchetee === undefined || !uniteAchat || poidsReelUniteBase === undefined) {
        return res.status(400).json({
          error: `Ligne ${i + 1} : Les champs articleId, prixTotalLigne, quantiteAchetee, uniteAchat et poidsReelUniteBase sont obligatoires.`
        });
      }
      if (isNaN(parseFloat(prixTotalLigne)) || parseFloat(prixTotalLigne) < 0) {
        return res.status(400).json({ error: `Ligne ${i + 1} : prixTotalLigne doit être un nombre positif.` });
      }
      if (isNaN(parseFloat(quantiteAchetee)) || parseFloat(quantiteAchetee) <= 0) {
        return res.status(400).json({ error: `Ligne ${i + 1} : quantiteAchetee doit être supérieure à 0.` });
      }
      if (isNaN(parseFloat(poidsReelUniteBase)) || parseFloat(poidsReelUniteBase) <= 0) {
        return res.status(400).json({ error: `Ligne ${i + 1} : poidsReelUniteBase doit être supérieur à 0.` });
      }
    }

    // Exécution dans une transaction Prisma
    const resultat = await prisma.$transaction(async (tx) => {
      // 1. Créer la Facture parente
      const facture = await tx.facture.create({
        data: {
          numeroFacture: numeroFacture || null,
          dateFacture: dateFacture ? new Date(dateFacture) : new Date(),
          fournisseur: fournisseur || null
        }
      });

      const nouvellesLignes = [];

      // 2. Traiter chaque ligne
      for (const ligne of lignes) {
        const prixTotal = parseFloat(ligne.prixTotalLigne);
        const quantite = parseFloat(ligne.quantiteAchetee);
        const poidsBase = parseFloat(ligne.poidsReelUniteBase);
        const isAchatSpecifique = !!ligne.achatSpecifique;
        const articleId = ligne.articleId;

        // a. Créer AchatFacture (Ligne de la facture)
        const nouvelAchat = await tx.achatFacture.create({
          data: {
            articleId,
            prixTotalLigne: prixTotal,
            quantiteAchetee: quantite,
            uniteAchat: ligne.uniteAchat,
            poidsReelUniteBase: poidsBase,
            evenementDevisId: ligne.evenementDevisId || null,
            achatSpecifique: isAchatSpecifique,
            factureId: facture.id
          }
        });
        nouvellesLignes.push(nouvelAchat);

        // b. Mettre à jour "prixUnitaireBase" sur l'Article
        const nouveauPrixUnitaireBase = Math.round((prixTotal / poidsBase) * 100) / 100;
        await tx.article.update({
          where: { id: articleId },
          data: {
            prixUnitaireBase: nouveauPrixUnitaireBase
          }
        });
      }

      return { facture, lignes: nouvellesLignes };
    });

    return res.status(201).json({
      message: "Facture et ses lignes d'achats enregistrées avec succès.",
      facture: resultat.facture,
      lignes: resultat.lignes
    });

  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la facture :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'enregistrement." });
  }
});

module.exports = router;
