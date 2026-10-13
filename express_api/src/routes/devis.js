const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. LIRE TOUS LES DEVIS ÉVÉNEMENTIELS (avec valorisation analytique globale)
router.get('/', async (req, res) => {
  try {
    const devis = await prisma.evenementDevis.findMany({
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
      },
      orderBy: { dateEvenement: 'asc' }
    });

    // Calcul analytique de la valorisation matière première globale de chaque événement devis
    const devisAvecValorisation = devis.map(d => {
      let coutTotalMatiereDevis = 0.0;

      // Ajouter le coût des achats spécifiques
      if (d.achatsFactures && d.achatsFactures.length > 0) {
        d.achatsFactures.forEach(af => {
          if (af.achatSpecifique) {
            coutTotalMatiereDevis += af.prixTotalLigne || 0.0;
          }
        });
      }

      // Aplatir les lignes de produit du devis issues de l'arborescence Lots -> Prestations
      const devisLignes = [];
      if (d.devisLots) {
        d.devisLots.forEach(lot => {
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

      devisLignes.forEach(dl => {
        let coutParPortion = 0.0;
        if (dl.prixUnitaireFige && dl.prixUnitaireFige > 0) {
          coutParPortion = dl.prixUnitaireFige;
        } else if (dl.ficheTechnique && dl.ficheTechnique.lignes) {
          dl.ficheTechnique.lignes.forEach(l => {
            coutParPortion += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
          });
        }
        coutTotalMatiereDevis += coutParPortion * (dl.nombrePortions || 0);
      });

      // Calcul analytique cumulé de la main d'œuvre directe (en priorisant le taux figé)
      let coutTotalMainOeuvreDevis = 0.0;
      d.tempsTravail.forEach(t => {
        const rate = t.prixUnitaireFige && t.prixUnitaireFige > 0 ? t.prixUnitaireFige : (t.coutTotalMainOeuvre / (t.totalHeuresPrepareesEtJourJ || 1.0));
        coutTotalMainOeuvreDevis += (t.totalHeuresPrepareesEtJourJ || 0.0) * rate;
      });

      // Calcul analytique cumulé des frais externes
      let coutTotalFraisExterneDevis = 0.0;
      d.fraisExternes.forEach(f => {
        coutTotalFraisExterneDevis += f.montantHT || 0.0;
      });

      const coutAnalytiqueTotalDevis = coutTotalMatiereDevis + coutTotalMainOeuvreDevis + coutTotalFraisExterneDevis;

      return {
        id: d.id,
        nomClient: d.nomClient,
        dateEvenement: d.dateEvenement,
        chiffreAffairesSaisi: d.chiffreAffairesSaisi || 0.0,
        status: d.status || "Brouillon",
        tempsProductionEstimeHeures: d.tempsProductionEstimeHeures || 0.0,
        creeLe: d.creeLe,
        misAJourLe: d.misAJourLe,
        lignesCount: devisLignes.length,
        coutTotalMatiereDevis: Math.round(coutTotalMatiereDevis * 100) / 100,
        coutTotalMainOeuvreDevis: Math.round(coutTotalMainOeuvreDevis * 100) / 100,
        coutTotalFraisExterneDevis: Math.round(coutTotalFraisExterneDevis * 100) / 100,
        coutAnalytiqueTotalDevis: Math.round(coutAnalytiqueTotalDevis * 100) / 100
      };
    });

    return res.json(devisAvecValorisation);
  } catch (error) {
    console.error("Erreur lors du listing des devis :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. LIRE LES DÉTAILS D'UN DEVIS (avec valorisation analytique détaillée et décomposition)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.evenementDevis.findUnique({
      where: { id },
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
        tempsTravail: {
          include: {
            employe: true
          }
        },
        fraisExternes: true,
        achatsFactures: true
      }
    });

    if (!devis) {
      return res.status(404).json({ error: "Devis d'événement non trouvé." });
    }

    let coutTotalMatiereDevis = 0.0;

    // Ajouter le coût des achats spécifiques
    if (devis.achatsFactures && devis.achatsFactures.length > 0) {
      devis.achatsFactures.forEach(af => {
        if (af.achatSpecifique) {
          coutTotalMatiereDevis += af.prixTotalLigne || 0.0;
        }
      });
    }

    // Aplatir les lignes de produit issues de l'arborescence Lots -> Prestations
    const devisLignes = [];
    if (devis.devisLots) {
      devis.devisLots.forEach(lot => {
        if (lot.lignesProduit) {
          lot.lignesProduit.forEach(lp => {
            devisLignes.push({
              ...lp,
              nombrePortions: lp.quantitePrevue,
              lotNom: lot.nom,
              prestationNom: null
            });
          });
        }
        if (lot.prestations) {
          lot.prestations.forEach(prest => {
            if (prest.lignesProduit) {
              prest.lignesProduit.forEach(lp => {
                devisLignes.push({
                  ...lp,
                  nombrePortions: lp.quantitePrevue,
                  lotNom: lot.nom,
                  prestationNom: prest.nom
                });
              });
            }
          });
        }
      });
    }

    const lignesDetails = devisLignes.map(dl => {
      let coutParPortion = 0.0;
      if (dl.prixUnitaireFige && dl.prixUnitaireFige > 0) {
        coutParPortion = dl.prixUnitaireFige;
      } else if (dl.ficheTechnique && dl.ficheTechnique.lignes) {
        dl.ficheTechnique.lignes.forEach(l => {
          coutParPortion += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
        });
      }

      const coutTotalLigne = coutParPortion * (dl.nombrePortions || 0);
      coutTotalMatiereDevis += coutTotalLigne;

      return {
        id: dl.id,
        nombrePortions: dl.nombrePortions,
        ficheTechniqueId: dl.ficheTechniqueId,
        nomRecette: dl.ficheTechnique ? dl.ficheTechnique.nomRecette : "?",
        categoriePlat: dl.ficheTechnique ? dl.ficheTechnique.categoriePlat : "?",
        coutIngredientsPortion: Math.round(coutParPortion * 100) / 100,
        coutTotalLigneRecette: Math.round(coutTotalLigne * 100) / 100,
        prixUnitaireFige: dl.prixUnitaireFige,
        lotNom: dl.lotNom,
        prestationNom: dl.prestationNom
      };
    });

    // Calcul analytique cumulé de la main d'œuvre directe
    let coutTotalMainOeuvreDevis = 0.0;
    const tempsDetails = devis.tempsTravail.map(t => {
      const rateToUse = t.prixUnitaireFige && t.prixUnitaireFige > 0 ? t.prixUnitaireFige : t.employe.coutHoraireCharge;
      const calculatedCout = t.totalHeuresPrepareesEtJourJ * rateToUse;
      coutTotalMainOeuvreDevis += calculatedCout;
      return {
        id: t.id,
        nomEmploye: t.employe.nomOuType,
        role: t.employe.role,
        coutHoraire: rateToUse,
        heuresEffectuees: t.totalHeuresPrepareesEtJourJ,
        coutCalculer: calculatedCout,
        prixUnitaireFige: t.prixUnitaireFige
      };
    });

    // Calcul analytique cumulé des frais externes
    let coutTotalFraisExterneDevis = 0.0;
    const fraisDetails = devis.fraisExternes.map(f => {
      coutTotalFraisExterneDevis += f.montantHT || 0.0;
      return {
        id: f.id,
        categorie: f.categorie,
        montantHT: f.montantHT
      };
    });

    const coutAnalytiqueTotalDevis = coutTotalMatiereDevis + coutTotalMainOeuvreDevis + coutTotalFraisExterneDevis;

    return res.json({
      id: devis.id,
      nomClient: devis.nomClient,
      dateEvenement: devis.dateEvenement,
      chiffreAffairesSaisi: devis.chiffreAffairesSaisi || 0.0,
      status: devis.status || "Brouillon",
      tempsProductionEstimeHeures: devis.tempsProductionEstimeHeures || 0.0,
      creeLe: devis.creeLe,
      misAJourLe: devis.misAJourLe,
      recettesAffichees: lignesDetails,
      mainDeuvreDirecte: tempsDetails,
      fraisExternesDirects: fraisDetails,
      coutTotalMatiereDevis: Math.round(coutTotalMatiereDevis * 100) / 100,
      coutTotalMainOeuvreDevis: Math.round(coutTotalMainOeuvreDevis * 100) / 100,
      coutTotalFraisExterneDevis: Math.round(coutTotalFraisExterneDevis * 100) / 100,
      coutAnalytiqueTotalDevis: Math.round(coutAnalytiqueTotalDevis * 100) / 100
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du devis :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 3. ENREGISTRER UN NOUVEL ÉVÉNEMENT (MOTEUR COÛT DE REVIENT)
router.post('/', async (req, res) => {
  try {
    const { nomClient, dateEvenement, chiffreAffairesSaisi, devisLots, devisLignes, tempsTravail, fraisExternes, tauxPerteSaisi, tempsProductionEstimeHeures } = req.body;

    if (!nomClient || !dateEvenement) {
      return res.status(400).json({ error: "Les champs nomClient et dateEvenement sont obligatoires." });
    }

    const dateValide = new Date(dateEvenement);
    if (isNaN(dateValide.getTime())) {
      return res.status(400).json({ error: "Le champ dateEvenement doit être une date valide." });
    }

    const caSaisi = parseFloat(chiffreAffairesSaisi || 0.0);
    const parsedTempsProd = tempsProductionEstimeHeures !== undefined && tempsProductionEstimeHeures !== null ? parseFloat(tempsProductionEstimeHeures) : 0;

    // Transaction Prisma : créer l'événement ET insérer toutes les lignes associées
    const nouvelEvenement = await prisma.$transaction(async (tx) => {
      const devis = await tx.evenementDevis.create({
        data: {
          nomClient,
          dateEvenement: dateValide,
          chiffreAffairesSaisi: caSaisi,
          tempsProductionEstimeHeures: parsedTempsProd
        }
      });

      // Helper function to freeze ingredient unit price at precise creation time
      async function getFrozenCost(ficheTechniqueId) {
        const ft = await tx.ficheTechnique.findUnique({
          where: { id: ficheTechniqueId },
          include: {
            lignes: {
              include: {
                article: true
              }
            }
          }
        });
        let cost = 0.0;
        if (ft && ft.lignes) {
          ft.lignes.forEach(l => {
            cost += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
          });
        }
        return cost;
      }

      // Handle new hierarchical devisLots array if present
      if (devisLots && Array.isArray(devisLots)) {
        for (const lotInput of devisLots) {
          const lot = await tx.devisLot.create({
            data: {
              evenementDevisId: devis.id,
              nom: lotInput.nom || "Lot Sans Nom"
            }
          });

          // Direct lines in lot
          if (lotInput.lignesProduit && Array.isArray(lotInput.lignesProduit)) {
            for (const lp of lotInput.lignesProduit) {
              const qty = lp.quantitePrevue !== undefined ? lp.quantitePrevue : (lp.nombrePortions || 0);
              const frozenPrice = await getFrozenCost(lp.ficheTechniqueId);
              await tx.devisLigneProduit.create({
                data: {
                  devisLotId: lot.id,
                  devisPrestationId: null,
                  ficheTechniqueId: lp.ficheTechniqueId,
                  quantitePrevue: parseInt(qty, 10),
                  prixUnitaireFige: frozenPrice
                }
              });
            }
          }

          // Prestations in lot
          if (lotInput.prestations && Array.isArray(lotInput.prestations)) {
            for (const prestInput of lotInput.prestations) {
              const prestation = await tx.devisPrestation.create({
                data: {
                  devisLotId: lot.id,
                  nom: prestInput.nom || "Prestation Sans Nom"
                }
              });

              if (prestInput.lignesProduit && Array.isArray(prestInput.lignesProduit)) {
                for (const lp of prestInput.lignesProduit) {
                  const qty = lp.quantitePrevue !== undefined ? lp.quantitePrevue : (lp.nombrePortions || 0);
                  const frozenPrice = await getFrozenCost(lp.ficheTechniqueId);
                  await tx.devisLigneProduit.create({
                    data: {
                      devisLotId: lot.id,
                      devisPrestationId: prestation.id,
                      ficheTechniqueId: lp.ficheTechniqueId,
                      quantitePrevue: parseInt(qty, 10),
                      prixUnitaireFige: frozenPrice
                    }
                  });
                }
              }
            }
          }
        }
      } 
      // Defensive Fallback: If old flat devisLignes is sent, wrap them into a default Lot "Prestations Générales"
      else if (devisLignes && Array.isArray(devisLignes)) {
        const lot = await tx.devisLot.create({
          data: {
            evenementDevisId: devis.id,
            nom: "Prestations Générales"
          }
        });

        for (const dl of devisLignes) {
          const qty = dl.quantitePrevue !== undefined ? dl.quantitePrevue : (dl.nombrePortions || 0);
          const frozenPrice = await getFrozenCost(dl.ficheTechniqueId);
          await tx.devisLigneProduit.create({
            data: {
              devisLotId: lot.id,
              devisPrestationId: null,
              ficheTechniqueId: dl.ficheTechniqueId,
              quantitePrevue: parseInt(qty, 10),
              prixUnitaireFige: frozenPrice
            }
          });
        }
      }

      if (tempsTravail && Array.isArray(tempsTravail)) {
        for (const tt of tempsTravail) {
          const hoursInput = tt.totalHeuresPrepareesEtJourJ !== undefined ? tt.totalHeuresPrepareesEtJourJ : tt.heuresEffectueesCuisine;
          if (!tt.employeId || hoursInput === undefined) {
            throw new Error("Chaque ligne de personnel doit contenir un employeId et des heures.");
          }
          // Récupérer le taux horaire de l'employé
          const emp = await tx.employeOuProfil.findUnique({ where: { id: tt.employeId } });
          const rate = emp ? emp.coutHoraireCharge : 0;
          const hours = parseFloat(hoursInput);
          await tx.tempsTravailEvenement.create({
            data: {
              evenementDevisId: devis.id,
              employeId: tt.employeId,
              totalHeuresPrepareesEtJourJ: hours,
              prixUnitaireFige: rate,
              coutTotalMainOeuvre: hours * rate
            }
          });
        }
      }

      if (fraisExternes && Array.isArray(fraisExternes)) {
        for (const fe of fraisExternes) {
          if (!fe.categorie || fe.montantHT === undefined) {
            throw new Error("Chaque frais externe doit contenir une categorie et un montantHT.");
          }
          await tx.fraisExterne.create({
            data: {
              evenementDevisId: devis.id,
              categorie: fe.categorie,
              montantHT: parseFloat(fe.montantHT)
            }
          });
        }
      }

      // Charger la configuration globale pour initialiser l'analyse de rentabilité avec les bonnes valeurs par défaut
      let config = await tx.configurationGlobale.findUnique({
        where: { id: 'single-config-row' }
      });
      if (!config) {
        config = {
          quotePartChargesTraiteurPourcentage: 80.0,
          tauxPerteForfaitaireDefaut: 0.0
        };
      }

      let tPerte = config.tauxPerteForfaitaireDefaut;
      let tPerteSaisi = null;
      if (tauxPerteSaisi !== undefined && tauxPerteSaisi !== null) {
        const parsed = parseFloat(tauxPerteSaisi);
        if (!isNaN(parsed) && parsed >= 0) {
          tPerte = parsed;
          tPerteSaisi = parsed;
        }
      }

      const calculatedFraisFixes = (12000.0 / 50.0) * (config.quotePartChargesTraiteurPourcentage / 100.0);

      await tx.analyseRentabilite.create({
        data: {
          evenementDevisId: devis.id,
          totalCoutMatiere: 0,
          totalMainOeuvreDirecte: 0,
          totalFraisExternes: 0,
          margeBruteHT: 0,
          quotePartFraisFixes: Math.round(calculatedFraisFixes * 100) / 100,
          tauxPerteForfaitaire: tPerte,
          tauxPerteSaisi: tPerteSaisi,
          coutPerteAlimentaire: 0,
          margeNetteHT: 0,
          coutRevientParConvive: 0
        }
      });

      return devis;
    });

    const complete = await prisma.evenementDevis.findUnique({
      where: { id: nouvelEvenement.id },
      include: {
        devisLots: {
          include: {
            lignesProduit: {
              include: {
                ficheTechnique: true
              }
            },
            prestations: {
              include: {
                lignesProduit: {
                  include: {
                    ficheTechnique: true
                  }
                }
              }
            }
          }
        },
        tempsTravail: {
          include: {
            employe: true
          }
        },
        fraisExternes: true,
        analyseRentabilite: true
      }
    });

    return res.status(201).json(complete);

  } catch (error) {
    console.error("Erreur lors de la création de l'événement :", error);
    return res.status(400).json({ error: error.message || "Une erreur interne est survenue." });
  }
});

// 3.5 MODIFIER UN ÉVÉNEMENT (CA SAISI, DATE, NOM, STATUT + HOOK STOCKS)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nomClient, dateEvenement, chiffreAffairesSaisi, status, statut, tempsProductionEstimeHeures } = req.body;
    const activeStatus = status !== undefined ? status : statut;

    const devis = await prisma.evenementDevis.findUnique({
      where: { id },
      include: {
        devisLots: {
          include: {
            lignesProduit: {
              include: {
                ficheTechnique: {
                  include: {
                    lignes: true
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
                        lignes: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!devis) {
      return res.status(404).json({ error: "Evénement non trouvé." });
    }

    const updateData = {};
    if (nomClient !== undefined) updateData.nomClient = nomClient;
    if (dateEvenement !== undefined) {
      const dateValide = new Date(dateEvenement);
      if (isNaN(dateValide.getTime())) {
        return res.status(400).json({ error: "Date d'événement invalide." });
      }
      updateData.dateEvenement = dateValide;
    }
    if (chiffreAffairesSaisi !== undefined) {
      updateData.chiffreAffairesSaisi = parseFloat(chiffreAffairesSaisi);
    }
    if (activeStatus !== undefined) {
      updateData.status = activeStatus;
    }
    if (tempsProductionEstimeHeures !== undefined) {
      updateData.tempsProductionEstimeHeures = tempsProductionEstimeHeures !== null ? parseFloat(tempsProductionEstimeHeures) : null;
    }

    const evenementMisAJour = await prisma.evenementDevis.update({
      where: { id },
      data: updateData
    });

    return res.json(evenementMisAJour);

  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'événement :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 4. SUPPRIMER UN ÉVÉNEMENT DEVIS
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.evenementDevis.findUnique({ where: { id } });
    if (!devis) {
      return res.status(404).json({ error: "Devis d'événement non trouvé." });
    }

    await prisma.evenementDevis.delete({ where: { id } });

    return res.json({ message: "Devis d'événement et ses lignes associés supprimés avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du devis :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

module.exports = router;
