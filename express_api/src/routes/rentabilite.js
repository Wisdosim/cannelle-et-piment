const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. OBTENIR LA CONSOLIDATION ET LA VALORISATION POUR LES GRAPHIQUES (Marge nette & Coût par convive)
router.get('/:evenementDevisId', async (req, res) => {
  try {
    const { evenementDevisId } = req.params;

    // 1. Récupérer le Devis avec toutes ses ramifications analytiques
    const devis = await prisma.evenementDevis.findUnique({
      where: { id: evenementDevisId },
      include: {
        devisLots: {
          include: {
            lignesProduit: {
              include: {
                ficheTechnique: {
                  include: {
                    lignes: {
                      include: {
                        article: true
                      }
                    }
                  }
                }
              }
            },
            prestations: {
              include: {
                lignesProduit: {
                  include: {
                    ficheTechnique: {
                      include: {
                        lignes: {
                          include: {
                            article: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        tempsTravail: true,
        fraisExternes: true,
        achatsFactures: true
      }
    });

    if (!devis) {
      return res.status(404).json({ error: "Événement devis non trouvé." });
    }

    // 2. Chercher si une consolidation existait déjà pour pré-remplir les valeurs de frais fixes et pertes
    const existing = await prisma.analyseRentabilite.findUnique({
      where: { evenementDevisId }
    });

    // Charger la configuration globale depuis la base
    let config = await prisma.configurationGlobale.findUnique({
      where: { id: 'single-config-row' }
    });
    if (!config) {
      config = {
        quotePartChargesTraiteurPourcentage: 80.0,
        tauxPerteForfaitaireDefaut: 0.0
      };
    }

    // VARIABLES GLOBALES DE COMPTABILITÉ ANALYTIQUE
    const DEFAULT_TAUX_PERTE_FORFAITAIRE = config.tauxPerteForfaitaireDefaut;

    // Charger les paramètres financiers (Charges fixes du laboratoire)
    let pFin = await prisma.parametresFinanciers.findUnique({
      where: { id: 'single-financials-row' }
    });
    if (!pFin) {
      pFin = await prisma.parametresFinanciers.create({
        data: { id: 'single-financials-row' }
      });
    }

    const totalChargesFin =
      pFin.loyerAnnuel +
      pFin.electriciteAnnuelle +
      pFin.assurancesAnnuelles +
      pFin.masseSalarialeIndirecte +
      pFin.autresChargesAnnuelles;

    const capaciteAnnuelleHeures = pFin.joursOuvertureAn * pFin.heuresParJour;
    const coutHoraireLabo = capaciteAnnuelleHeures > 0 ? (totalChargesFin / capaciteAnnuelleHeures) : 0;

    const tempsProduction = devis.tempsProductionEstimeHeures || 0;
    const fraisFixesImputes = tempsProduction * coutHoraireLabo;
    let qFraisFixes = Math.round(fraisFixesImputes * 100) / 100;

    // Résolution du Taux de Perte actif
    // Priorité : Query param > tauxPerteSaisi (champ événement) > tauxPerteForfaitaire DB > default
    let tauxPerteActif = DEFAULT_TAUX_PERTE_FORFAITAIRE;
    let tauxPerteSaisiPourPersistance = null; // null = pas de saisie manuelle
    if (req.query.tauxPerteSaisi !== undefined) {
      const parsed = parseFloat(req.query.tauxPerteSaisi);
      if (!isNaN(parsed) && parsed >= 0) {
        tauxPerteActif = parsed;
        tauxPerteSaisiPourPersistance = parsed;
      }
    } else if (existing && existing.tauxPerteSaisi !== null) {
      // Utiliser le taux saisi manuellement s'il existe en base
      tauxPerteActif = existing.tauxPerteSaisi;
      tauxPerteSaisiPourPersistance = existing.tauxPerteSaisi;
    } else if (req.query.tauxPerteForfaitaire !== undefined) {
      const parsed = parseFloat(req.query.tauxPerteForfaitaire);
      if (!isNaN(parsed) && parsed >= 0) tauxPerteActif = parsed;
    } else if (existing && existing.tauxPerteForfaitaire !== null) {
      tauxPerteActif = existing.tauxPerteForfaitaire;
    }


    // Coût Perte Alimentaire (calculable immédiatement, appliqué après calcul matiere)
    let cPerteAlimentaire = 0.0;

    // Aplatir les lignes de produit issues de l'arborescence Lots -> Prestations
    const devisLignes = [];
    if (devis.devisLots) {
      devis.devisLots.forEach(lot => {
        if (lot.lignesProduit) {
          lot.lignesProduit.forEach(lp => {
            devisLignes.push({
              ...lp,
              nombrePortions: lp.quantitePrevue
            });
          });
        }
        if (lot.prestations) {
          lot.prestations.forEach(prest => {
            if (prest.lignesProduit) {
              prest.lignesProduit.forEach(lp => {
                devisLignes.push({
                  ...lp,
                  nombrePortions: lp.quantitePrevue
                });
              });
            }
          });
        }
      });
    }

    // 3. Calculer le coût total des matières premières (Ingrédients)
    let totalCoutMatiere = 0.0;
    let totalConvives = 0;
    devisLignes.forEach(dl => {
      let coutParPortion = 0.0;
      if (dl.prixUnitaireFige && dl.prixUnitaireFige > 0) {
        coutParPortion = dl.prixUnitaireFige;
      } else if (dl.ficheTechnique && dl.ficheTechnique.lignes) {
        dl.ficheTechnique.lignes.forEach(l => {
          coutParPortion += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
        });
      }
      totalCoutMatiere += coutParPortion * (dl.nombrePortions || 0);
      totalConvives += dl.nombrePortions || 0;
    });

    // Somme des achats spécifiques affectés à cet événement
    let totalAchatsSpecifiques = 0.0;
    if (devis.achatsFactures && devis.achatsFactures.length > 0) {
      devis.achatsFactures.forEach(af => {
        if (af.achatSpecifique) {
          totalAchatsSpecifiques += af.prixTotalLigne || 0.0;
        }
      });
    }
    totalCoutMatiere += totalAchatsSpecifiques;

    // Calcul de l'impact RSE de l'événement (Score EGAlim)
    let totalRSEIngredientsCost = 0.0;
    const rseCosts = {
      Bio: 0.0,
      Local: 0.0,
      Label: 0.0,
      Standard: 0.0
    };

    devisLignes.forEach(dl => {
      if (dl.ficheTechnique && dl.ficheTechnique.lignes) {
        dl.ficheTechnique.lignes.forEach(l => {
          const ingredientCost = (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0) * (dl.nombrePortions || 0);
          totalRSEIngredientsCost += ingredientCost;
          
          const classification = l.article.classificationRSE;
          if (classification === 'Bio') {
            rseCosts.Bio += ingredientCost;
          } else if (classification === 'Local') {
            rseCosts.Local += ingredientCost;
          } else if (classification === 'Labellisé (AOP/AOC...)' || classification === 'Labellisé') {
            rseCosts.Label += ingredientCost;
          } else {
            rseCosts.Standard += ingredientCost;
          }
        });
      }
    });

    const rseImpact = {
      totalHT: totalRSEIngredientsCost,
      Bio: {
        montantHT: rseCosts.Bio,
        pourcentage: totalRSEIngredientsCost > 0 ? Math.round((rseCosts.Bio / totalRSEIngredientsCost) * 100) : 0
      },
      Local: {
        montantHT: rseCosts.Local,
        pourcentage: totalRSEIngredientsCost > 0 ? Math.round((rseCosts.Local / totalRSEIngredientsCost) * 100) : 0
      },
      Labellise: {
        montantHT: rseCosts.Label,
        pourcentage: totalRSEIngredientsCost > 0 ? Math.round((rseCosts.Label / totalRSEIngredientsCost) * 100) : 0
      },
      Standard: {
        montantHT: rseCosts.Standard,
        pourcentage: totalRSEIngredientsCost > 0 ? Math.round((rseCosts.Standard / totalRSEIngredientsCost) * 100) : 0
      }
    };

    // Application du taux de perte actif (tauxPerteSaisi prioritaire sur tauxPerteForfaitaire)
    cPerteAlimentaire = totalCoutMatiere * (tauxPerteActif / 100.0);
    if (req.query.coutPerteAlimentaire !== undefined) {
      const parsed = parseFloat(req.query.coutPerteAlimentaire);
      if (!isNaN(parsed) && parsed >= 0) cPerteAlimentaire = parsed;
    }

    // 4. Calculer le coût total de la main d'œuvre directe (en priorisant le taux figé)
    let totalMainOeuvreDirecte = 0.0;
    devis.tempsTravail.forEach(t => {
      const rate = t.prixUnitaireFige && t.prixUnitaireFige > 0 ? t.prixUnitaireFige : (t.coutTotalMainOeuvre / (t.totalHeuresPrepareesEtJourJ || 1.0));
      totalMainOeuvreDirecte += (t.totalHeuresPrepareesEtJourJ || 0.0) * rate;
    });

    // 5. Calculer le coût total des frais externes
    let totalFraisExternes = 0.0;
    devis.fraisExternes.forEach(f => {
      totalFraisExternes += f.montantHT || 0.0;
    });

    // Retro-compatibilité et initialisation des budgets
    let caPrevu = devis.chiffreAffairesSaisiPrevu;
    let caReel = devis.chiffreAffairesSaisiReel;
    if (caPrevu === 0 || caReel === 0) {
      caPrevu = caPrevu || devis.chiffreAffairesSaisi || 0.0;
      caReel = caReel || devis.chiffreAffairesSaisi || 0.0;
      await prisma.evenementDevis.update({
        where: { id: evenementDevisId },
        data: {
          chiffreAffairesSaisiPrevu: caPrevu,
          chiffreAffairesSaisiReel: caReel
        }
      });
    }

    // 6. Calculs Comptables Analytiques
    const chiffreAffaires = devis.chiffreAffairesSaisi || 0.0;
    const margeBrute = chiffreAffaires - totalCoutMatiere;
    const margeNette = chiffreAffaires - totalCoutMatiere - qFraisFixes;

    // Coût de revient total = Coût Ingrédients / Matière + Allocation Charges Fixes
    const totalCoutRevient = totalCoutMatiere + qFraisFixes;

    // Coût de revient par convive (invité)
    const convivesResolu = totalConvives > 0 ? totalConvives : 1;
    const coutRevientParConvive = totalCoutRevient / convivesResolu;

    // Arrondis comptables à 2 décimales
    const tCA = Math.round(chiffreAffaires * 100) / 100;
    const tMatiere = Math.round(totalCoutMatiere * 100) / 100;
    const tPersonnel = Math.round(totalMainOeuvreDirecte * 100) / 100;
    const tLogistique = Math.round(totalFraisExternes * 100) / 100;
    const tCoutsDirects = Math.round((totalCoutMatiere + totalMainOeuvreDirecte + totalFraisExternes) * 100) / 100;
    const tMargeBrute = Math.round(margeBrute * 100) / 100;
    const tMargeNette = Math.round(margeNette * 100) / 100;
    const tFraisFixes = Math.round(qFraisFixes * 100) / 100;
    const tPerte = Math.round(cPerteAlimentaire * 100) / 100;
    const tCoutRevientTotal = Math.round(totalCoutRevient * 100) / 100;
    const tCoutRevientParConvive = Math.round(coutRevientParConvive * 100) / 100;
    const tTauxPerte = Math.round(tauxPerteActif * 100) / 100;

    // 7. Persister les données consolidées dans la table AnalyseRentabilite (Upsert)
    const consolidationPersistee = await prisma.analyseRentabilite.upsert({
      where: { evenementDevisId },
      update: {
        totalCoutMatiere: tMatiere,
        totalMainOeuvreDirecte: tPersonnel,
        totalFraisExternes: tLogistique,
        margeBruteHT: tMargeBrute,
        quotePartFraisFixes: tFraisFixes,
        tauxPerteForfaitaire: tTauxPerte,
        tauxPerteSaisi: tauxPerteSaisiPourPersistance,
        coutPerteAlimentaire: tPerte,
        margeNetteHT: tMargeNette,
        coutRevientParConvive: tCoutRevientParConvive,
        coutMatierePrevu: existing && existing.coutMatierePrevu > 0 ? existing.coutMatierePrevu : tMatiere,
        coutMatiereReel: existing && existing.coutMatiereReel > 0 ? existing.coutMatiereReel : tMatiere,
        coutMainOeuvrePrevu: existing && existing.coutMainOeuvrePrevu > 0 ? existing.coutMainOeuvrePrevu : tPersonnel,
        coutMainOeuvreReel: existing && existing.coutMainOeuvreReel > 0 ? existing.coutMainOeuvreReel : tPersonnel
      },
      create: {
        evenementDevisId,
        totalCoutMatiere: tMatiere,
        totalMainOeuvreDirecte: tPersonnel,
        totalFraisExternes: tLogistique,
        margeBruteHT: tMargeBrute,
        quotePartFraisFixes: tFraisFixes,
        tauxPerteForfaitaire: tTauxPerte,
        tauxPerteSaisi: tauxPerteSaisiPourPersistance,
        coutPerteAlimentaire: tPerte,
        margeNetteHT: tMargeNette,
        coutRevientParConvive: tCoutRevientParConvive,
        coutMatierePrevu: tMatiere,
        coutMatiereReel: tMatiere,
        coutMainOeuvrePrevu: tPersonnel,
        coutMainOeuvreReel: tPersonnel
      }
    });

    // 8. Générer et enregistrer l'historique complet d'audit de traçabilité des calculs (ExplicationCalcul) supprimé pour optimisation

    // 9. Formater les données pour les graphiques visuels
    const totalRepresentatif = tCA > 0 ? tCA : (tCoutRevientTotal || 1.0);
    const pctMatiereCA = Math.round((tMatiere / totalRepresentatif) * 1000) / 10;
    const pctPersonnelCA = Math.round((tPersonnel / totalRepresentatif) * 1000) / 10;
    const pctLogistiqueCA = Math.round((tLogistique / totalRepresentatif) * 1000) / 10;
    const pctFraisFixesCA = Math.round((tFraisFixes / totalRepresentatif) * 1000) / 10;
    const pctPerteCA = Math.round((tPerte / totalRepresentatif) * 1000) / 10;
    const pctMargeNetteCA = tCA > 0 ? Math.round((tMargeNette / totalRepresentatif) * 1000) / 10 : 0.0;

    const graphiqueChiffreAffaires = [
      { id: "matiere", label: "Matières Premières (Ingrédients)", value: tMatiere, percentage: pctMatiereCA, color: "#FF6384" },
      { id: "main_oeuvre", label: "Main d'œuvre Directe", value: tPersonnel, percentage: pctPersonnelCA, color: "#36A2EB" },
      { id: "frais_externes", label: "Frais Externes Directs", value: tLogistique, percentage: pctLogistiqueCA, color: "#FFCE56" }
    ];

    if (tFraisFixes > 0) {
      graphiqueChiffreAffaires.push({ id: "frais_fixes", label: "Frais Fixes Allocations", value: tFraisFixes, percentage: pctFraisFixesCA, color: "#9966FF" });
    }
    if (tPerte > 0) {
      graphiqueChiffreAffaires.push({ id: "perte_alimentaire", label: "Pertes/Gaspillage Alimentaire", value: tPerte, percentage: pctPerteCA, color: "#C9CBCF" });
    }

    if (tCA > 0) {
      graphiqueChiffreAffaires.push({
        id: "marge_nette",
        label: tMargeNette >= 0 ? "Marge Nette HT" : "Perte Nette HT",
        value: tMargeNette,
        percentage: pctMargeNetteCA,
        color: tMargeNette >= 0 ? "#4BC0C0" : "#E2583E"
      });
    }

    // Répartition en Part des Coûts Globaux Consolidés
    const baseCouts = tCoutRevientTotal > 0 ? tCoutRevientTotal : 1.0;
    const pctMatiereCouts = Math.round((tMatiere / baseCouts) * 1000) / 10;
    const pctPersonnelCouts = Math.round((tPersonnel / baseCouts) * 1000) / 10;
    const pctLogistiqueCouts = Math.round((tLogistique / baseCouts) * 1000) / 10;
    const pctFraisFixesCouts = Math.round((tFraisFixes / baseCouts) * 1000) / 10;
    const pctPerteCouts = Math.round((tPerte / baseCouts) * 1000) / 10;

    const graphiqueRepartionCoutsGlobaux = [
      { id: "matiere", label: "Matières Premières", value: tMatiere, percentage: pctMatiereCouts, color: "#FF6384" },
      { id: "main_oeuvre", label: "Main d'œuvre", value: tPersonnel, percentage: pctPersonnelCouts, color: "#36A2EB" },
      { id: "frais_externes", label: "Frais Directs", value: tLogistique, percentage: pctLogistiqueCouts, color: "#FFCE56" }
    ];

    if (tFraisFixes > 0) {
      graphiqueRepartionCoutsGlobaux.push({ id: "frais_fixes", label: "Frais Fixes", value: tFraisFixes, percentage: pctFraisFixesCouts, color: "#9966FF" });
    }
    if (tPerte > 0) {
      graphiqueRepartionCoutsGlobaux.push({ id: "perte_alimentaire", label: "Pertes Alimentaires", value: tPerte, percentage: pctPerteCouts, color: "#C9CBCF" });
    }

    // Indicateurs clés de rentabilité (KPIs)
    const tauxMargeBrute = tCA > 0 ? Math.round((tMargeBrute / tCA) * 10000) / 100 : 0.0;
    const tauxMargeNette = tCA > 0 ? Math.round((tMargeNette / tCA) * 10000) / 100 : 0.0;
    const coefficientMultiplicateur = tCoutRevientTotal > 0 ? Math.round((tCA / tCoutRevientTotal) * 100) / 100 : 0.0;
    const caParConvive = totalConvives > 0 ? Math.round((tCA / totalConvives) * 100) / 100 : 0.0;

    // --- CONSTRUCTION DU BUDGET PREVISIONNEL VS REEL ---
    const prevuMatiere = Math.round((consolidationPersistee.coutMatierePrevu || tMatiere) * 100) / 100;
    const prevuCoutRevientTotal = Math.round((prevuMatiere + tFraisFixes) * 100) / 100;
    const prevuMargeBrute = Math.round((caPrevu - prevuMatiere) * 100) / 100;
    const prevuMargeNette = Math.round((caPrevu - prevuMatiere - tFraisFixes) * 100) / 100;
    const prevuCoutRevientParConvive = totalConvives > 0 ? Math.round((prevuCoutRevientTotal / totalConvives) * 100) / 100 : 0.0;

    const reelMatiere = Math.round((consolidationPersistee.coutMatiereReel || tMatiere) * 100) / 100;
    const reelCoutRevientTotal = Math.round((reelMatiere + tFraisFixes) * 100) / 100;
    const reelMargeBrute = Math.round((caReel - reelMatiere) * 100) / 100;
    const reelMargeNette = Math.round((caReel - reelMatiere - tFraisFixes) * 100) / 100;
    const reelCoutRevientParConvive = totalConvives > 0 ? Math.round((reelCoutRevientTotal / totalConvives) * 100) / 100 : 0.0;

    const prevuPersonnel = Math.round((consolidationPersistee.coutMainOeuvrePrevu || tPersonnel) * 100) / 100;
    const reelPersonnel = Math.round((consolidationPersistee.coutMainOeuvreReel || tPersonnel) * 100) / 100;
    const prevuPerte = Math.round((tauxPerteActif / 100) * prevuMatiere * 100) / 100;
    const reelPerte = Math.round((tauxPerteActif / 100) * reelMatiere * 100) / 100;

    const delta = (reel, prevu) => {
      const val = reel - prevu;
      const pct = prevu !== 0 ? (val / prevu) * 100 : 0;
      return {
        valeur: Math.round(val * 100) / 100,
        pourcentage: Math.round(pct * 100) / 100
      };
    };

    const budgetPrevisionnel = {
      chiffreAffaires: caPrevu,
      coutMatiere: prevuMatiere,
      coutMainOeuvre: prevuPersonnel,
      fraisExternes: tLogistique,
      fraisFixes: tFraisFixes,
      perteAlimentaire: prevuPerte,
      coutRevientTotal: prevuCoutRevientTotal,
      margeBrute: prevuMargeBrute,
      margeNette: prevuMargeNette,
      coutRevientParConvive: prevuCoutRevientParConvive
    };

    const coutReelPostEvenement = {
      chiffreAffaires: caReel,
      coutMatiere: reelMatiere,
      coutMainOeuvre: reelPersonnel,
      fraisExternes: tLogistique,
      fraisFixes: tFraisFixes,
      perteAlimentaire: reelPerte,
      coutRevientTotal: reelCoutRevientTotal,
      margeBrute: reelMargeBrute,
      margeNette: reelMargeNette,
      coutRevientParConvive: reelCoutRevientParConvive
    };

    const ecartDelta = {
      chiffreAffaires: delta(caReel, caPrevu),
      coutMatiere: delta(reelMatiere, prevuMatiere),
      coutMainOeuvre: delta(reelPersonnel, prevuPersonnel),
      fraisExternes: delta(tLogistique, tLogistique),
      fraisFixes: delta(tFraisFixes, tFraisFixes),
      perteAlimentaire: delta(reelPerte, prevuPerte),
      coutRevientTotal: delta(reelCoutRevientTotal, prevuCoutRevientTotal),
      margeBrute: delta(reelMargeBrute, prevuMargeBrute),
      margeNette: delta(reelMargeNette, prevuMargeNette),
      coutRevientParConvive: delta(reelCoutRevientParConvive, prevuCoutRevientParConvive)
    };

    return res.json({
      devisId: devis.id,
      nomClient: devis.nomClient,
      dateEvenement: devis.dateEvenement,
      chiffreAffairesSaisi: tCA,
      totalConvives,
      tauxPerteActif: tTauxPerte,
      tempsProductionEstimeHeures: devis.tempsProductionEstimeHeures || 0,
      coutHoraireLabo: coutHoraireLabo || 0,
      tauxPerteSaisiManuellement: tauxPerteSaisiPourPersistance !== null,
      indicateurs: {
        tauxMargeBrutePourcent: tauxMargeBrute,
        tauxMargeNettePourcent: tauxMargeNette,
        coefficientMultiplicateur,
        coutRevientParConvive: tCoutRevientParConvive,
        caParConvive,
        rentable: tMargeNette >= 0
      },
      consolidationPersistee,
      budgetPrevisionnel,
      coutReelPostEvenement,
      ecartDelta,
      graphiqueChiffreAffaires,
      graphiqueRepartionCoutsGlobaux,
      rseImpact
    });

  } catch (error) {
    console.error("Erreur de consolidation de rentabilité :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. METTRE À JOUR LE BUDGET PRÉVISIONNEL ET LES COÛTS RÉELS D'UN ÉVÉNEMENT
router.put('/:evenementDevisId', async (req, res) => {
  try {
    const { evenementDevisId } = req.params;
    const { 
      chiffreAffairesSaisiPrevu, 
      chiffreAffairesSaisiReel,
      coutMatierePrevu,
      coutMatiereReel,
      coutMainOeuvrePrevu,
      coutMainOeuvreReel,
      quotePartFraisFixes,
      tauxPerteSaisi
    } = req.body;

    const parsedCAPrevu = parseFloat(chiffreAffairesSaisiPrevu || 0);
    const parsedCAReel = parseFloat(chiffreAffairesSaisiReel || 0);

    // Mettre à jour l'EvenementDevis
    await prisma.evenementDevis.update({
      where: { id: evenementDevisId },
      data: {
        chiffreAffairesSaisiPrevu: parsedCAPrevu,
        chiffreAffairesSaisiReel: parsedCAReel,
        chiffreAffairesSaisi: parsedCAReel || parsedCAPrevu || 0.0
      }
    });

    // Mettre à jour l'AnalyseRentabilite
    const consolidation = await prisma.analyseRentabilite.upsert({
      where: { evenementDevisId },
      update: {
        coutMatierePrevu: parseFloat(coutMatierePrevu || 0),
        coutMatiereReel: parseFloat(coutMatiereReel || 0),
        coutMainOeuvrePrevu: parseFloat(coutMainOeuvrePrevu || 0),
        coutMainOeuvreReel: parseFloat(coutMainOeuvreReel || 0),
        quotePartFraisFixes: parseFloat(quotePartFraisFixes || 240.0),
        tauxPerteSaisi: tauxPerteSaisi !== undefined ? parseFloat(tauxPerteSaisi) : null
      },
      create: {
        evenementDevisId,
        totalCoutMatiere: parseFloat(coutMatiereReel || 0),
        totalMainOeuvreDirecte: parseFloat(coutMainOeuvreReel || 0),
        totalFraisExternes: 0.0,
        margeBruteHT: 0.0,
        coutMatierePrevu: parseFloat(coutMatierePrevu || 0),
        coutMatiereReel: parseFloat(coutMatiereReel || 0),
        coutMainOeuvrePrevu: parseFloat(coutMainOeuvrePrevu || 0),
        coutMainOeuvreReel: parseFloat(coutMainOeuvreReel || 0),
        quotePartFraisFixes: parseFloat(quotePartFraisFixes || 240.0),
        tauxPerteSaisi: tauxPerteSaisi !== undefined ? parseFloat(tauxPerteSaisi) : null
      }
    });

    return res.json({ success: true, consolidation });

  } catch (error) {
    console.error("Erreur lors de la mise à jour des prévus/réels :", error);
    return res.status(400).json({ error: error.message || "Une erreur est survenue." });
  }
});

module.exports = router;
