const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

const SINGLETON_ID = 'single-financials-row';

// 1. LIRE LES PARAMÈTRES FINANCIERS (avec initialisation par défaut si absents)
router.get('/financiers', async (req, res) => {
  try {
    let params = await prisma.parametresFinanciers.findUnique({
      where: { id: SINGLETON_ID }
    });

    if (!params) {
      params = await prisma.parametresFinanciers.create({
        data: { id: SINGLETON_ID }
      });
    }

    // Calcul du coût horaire labo côté serveur (pratique pour le frontend)
    const totalChargesAnnuelles =
      params.loyerAnnuel +
      params.electriciteAnnuelle +
      params.assurancesAnnuelles +
      params.masseSalarialeIndirecte +
      params.autresChargesAnnuelles;

    const capaciteAnnuelleHeures = params.joursOuvertureAn * params.heuresParJour;
    const coutHoraireLabo = capaciteAnnuelleHeures > 0
      ? Math.round((totalChargesAnnuelles / capaciteAnnuelleHeures) * 100) / 100
      : 0;

    return res.json({
      ...params,
      // Calculés à la volée
      totalChargesAnnuelles: Math.round(totalChargesAnnuelles * 100) / 100,
      capaciteAnnuelleHeures: Math.round(capaciteAnnuelleHeures * 100) / 100,
      coutHoraireLabo
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres financiers :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. METTRE À JOUR LES PARAMÈTRES FINANCIERS
router.put('/financiers', async (req, res) => {
  try {
    const {
      loyerAnnuel,
      electriciteAnnuelle,
      assurancesAnnuelles,
      masseSalarialeIndirecte,
      autresChargesAnnuelles,
      joursOuvertureAn,
      heuresParJour
    } = req.body;

    const parsePositive = (val, name) => {
      const n = parseFloat(val);
      if (isNaN(n) || n < 0) throw new Error(`"${name}" doit être un nombre positif.`);
      return n;
    };

    const data = {
      loyerAnnuel:             parsePositive(loyerAnnuel,             'Loyer annuel'),
      electriciteAnnuelle:     parsePositive(electriciteAnnuelle,     'Électricité annuelle'),
      assurancesAnnuelles:     parsePositive(assurancesAnnuelles,     'Assurances annuelles'),
      masseSalarialeIndirecte: parsePositive(masseSalarialeIndirecte, 'Masse salariale indirecte'),
      autresChargesAnnuelles:  parsePositive(autresChargesAnnuelles,  'Autres charges annuelles'),
      joursOuvertureAn:        parsePositive(joursOuvertureAn,        'Jours d\'ouverture par an'),
      heuresParJour:           parsePositive(heuresParJour,           'Heures par jour'),
    };

    const params = await prisma.parametresFinanciers.upsert({
      where:  { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data }
    });

    // Recalcul pour la réponse
    const totalChargesAnnuelles =
      params.loyerAnnuel + params.electriciteAnnuelle +
      params.assurancesAnnuelles + params.masseSalarialeIndirecte +
      params.autresChargesAnnuelles;
    const capaciteAnnuelleHeures = params.joursOuvertureAn * params.heuresParJour;
    const coutHoraireLabo = capaciteAnnuelleHeures > 0
      ? Math.round((totalChargesAnnuelles / capaciteAnnuelleHeures) * 100) / 100
      : 0;

    return res.json({
      message: "Paramètres financiers mis à jour avec succès.",
      params: { ...params, totalChargesAnnuelles, capaciteAnnuelleHeures, coutHoraireLabo }
    });

  } catch (error) {
    if (error.message && !error.code) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erreur lors de la mise à jour des paramètres financiers :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

module.exports = router;
