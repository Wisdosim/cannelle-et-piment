const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. LIRE LA CONFIGURATION GLOBALE UNIQUE (avec initialisation par défaut si absente)
router.get('/', async (req, res) => {
  try {
    let config = await prisma.configurationGlobale.findUnique({
      where: { id: 'single-config-row' }
    });

    if (!config) {
      // Créer la ligne par défaut
      config = await prisma.configurationGlobale.create({
        data: {
          id: 'single-config-row',
          quotePartChargesTraiteurPourcentage: 80.0,
          tauxPerteForfaitaireDefaut: 0.0
        }
      });
      console.log('Configuration globale par défaut initialisée avec succès en base.');
    }

    return res.json(config);
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration globale :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. METTRE À JOUR LA CONFIGURATION GLOBALE
router.put('/', async (req, res) => {
  try {
    const { quotePartChargesTraiteurPourcentage, tauxPerteForfaitaireDefaut } = req.body;

    const parsedQuotePart = parseFloat(quotePartChargesTraiteurPourcentage);
    const parsedTauxPerte = parseFloat(tauxPerteForfaitaireDefaut);

    // Validations
    if (isNaN(parsedQuotePart) || parsedQuotePart < 0 || parsedQuotePart > 100) {
      return res.status(400).json({ 
        error: "La quote-part des charges fixes traiteur doit être un pourcentage valide entre 0 et 100." 
      });
    }

    if (isNaN(parsedTauxPerte) || parsedTauxPerte < 0 || parsedTauxPerte > 100) {
      return res.status(400).json({ 
        error: "Le taux de perte forfaitaire par défaut doit être un pourcentage valide entre 0 et 100." 
      });
    }

    const config = await prisma.configurationGlobale.upsert({
      where: { id: 'single-config-row' },
      update: {
        quotePartChargesTraiteurPourcentage: parsedQuotePart,
        tauxPerteForfaitaireDefaut: parsedTauxPerte
      },
      create: {
        id: 'single-config-row',
        quotePartChargesTraiteurPourcentage: parsedQuotePart,
        tauxPerteForfaitaireDefaut: parsedTauxPerte
      }
    });

    return res.json({
      message: "Configuration globale mise à jour avec succès.",
      config
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la configuration globale :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

module.exports = router;
