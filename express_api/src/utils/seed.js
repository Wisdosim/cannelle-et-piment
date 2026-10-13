const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Démarrage du peuplement de la base de données SQLite...");

  async function getIngredientsCost(ficheTechniqueId) {
    const ft = await prisma.ficheTechnique.findUnique({
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

  // 1. Nettoyer la base de données existante (dans l'ordre inverse des relations)
  await prisma.analyseRentabilite.deleteMany({});
  await prisma.fraisExterne.deleteMany({});
  await prisma.tempsTravailEvenement.deleteMany({});
  await prisma.devisLigneProduit.deleteMany({});
  await prisma.devisPrestation.deleteMany({});
  await prisma.devisLot.deleteMany({});
  await prisma.evenementDevis.deleteMany({});
  await prisma.employeOuProfil.deleteMany({});
  await prisma.ficheTechniqueLigne.deleteMany({});
  await prisma.ficheTechnique.deleteMany({});
  await prisma.article.deleteMany({});

  console.log("✓ Base de données nettoyée.");

  // 3. Créer 20 articles (ingrédients de base)
  const articlesData = [
    { nom: "Filet de Boeuf Charolais", categorie: "Viandes", uniteAchat: "Kg", uniteRecette: "Gramme", facteurConversion: 1000, uniteBase: "Kg", prixUnitaireBase: 35.0, prixAchatUnitaire: 35.0 },
    { nom: "Beurre Doux Gastronomique", categorie: "Produits laitiers", uniteAchat: "Pièce", uniteRecette: "Gramme", facteurConversion: 250, uniteBase: "Kg", prixUnitaireBase: 8.0, prixAchatUnitaire: 2.0 },
    { nom: "Saumon Atlantique Filleté", categorie: "Poissons", uniteAchat: "Kg", uniteRecette: "Gramme", facteurConversion: 1000, uniteBase: "Kg", prixUnitaireBase: 24.0, prixAchatUnitaire: 24.0 },
    { nom: "Riz Arborio Premium", categorie: "Épicerie", uniteAchat: "Sac 5Kg", uniteRecette: "Gramme", facteurConversion: 5000, uniteBase: "Kg", prixUnitaireBase: 3.20, prixAchatUnitaire: 16.0 },
    { nom: "Asperges Vertes Fraîches", categorie: "Légumes", uniteAchat: "Botte", uniteRecette: "Pièce", facteurConversion: 10, uniteBase: "Pièce", prixUnitaireBase: 0.60, prixAchatUnitaire: 6.0 },
    { nom: "Bordeaux Rouge AOC", categorie: "Boissons", uniteAchat: "Caisse 6 Bouteilles", uniteRecette: "Centilitre", facteurConversion: 450, uniteBase: "L", prixUnitaireBase: 8.0, prixAchatUnitaire: 36.0 },
    { nom: "Noix de Saint-Jacques", categorie: "Poissons", uniteAchat: "Kg", uniteRecette: "Pièce", facteurConversion: 40, uniteBase: "Pièce", prixUnitaireBase: 1.25, prixAchatUnitaire: 50.0 },
    { nom: "Safran en filaments", categorie: "Épices", uniteAchat: "Pot 10g", uniteRecette: "Gramme", facteurConversion: 10, uniteBase: "Gramme", prixUnitaireBase: 30.0, prixAchatUnitaire: 300.0 },
    { nom: "Crème Liquide 35%", categorie: "Produits laitiers", uniteAchat: "Brique 1L", uniteRecette: "Centilitre", facteurConversion: 100, uniteBase: "L", prixUnitaireBase: 3.50, prixAchatUnitaire: 3.50 },
    { nom: "Magret de Canard", categorie: "Viandes", uniteAchat: "Kg", uniteRecette: "Gramme", facteurConversion: 1000, uniteBase: "Kg", prixUnitaireBase: 18.0, prixAchatUnitaire: 18.0 },
    { nom: "Figues Fraîches", categorie: "Légumes", uniteAchat: "Barquette", uniteRecette: "Pièce", facteurConversion: 12, uniteBase: "Pièce", prixUnitaireBase: 0.50, prixAchatUnitaire: 6.0 },
    { nom: "Miel d'Acacia", categorie: "Épicerie", uniteAchat: "Pot 500g", uniteRecette: "Gramme", facteurConversion: 500, uniteBase: "Kg", prixUnitaireBase: 14.0, prixAchatUnitaire: 7.0 },
    { nom: "Foie Gras de Canard", categorie: "Viandes", uniteAchat: "Lobe 500g", uniteRecette: "Gramme", facteurConversion: 500, uniteBase: "Kg", prixUnitaireBase: 80.0, prixAchatUnitaire: 40.0 },
    { nom: "Pain d'Épices Artisanal", categorie: "Épicerie", uniteAchat: "Tranche", uniteRecette: "Pièce", facteurConversion: 1, uniteBase: "Pièce", prixUnitaireBase: 0.80, prixAchatUnitaire: 0.80 },
    { nom: "Chocolat Noir 70%", categorie: "Épicerie", uniteAchat: "Tablette 200g", uniteRecette: "Gramme", facteurConversion: 200, uniteBase: "Kg", prixUnitaireBase: 12.50, prixAchatUnitaire: 2.50 },
    { nom: "Piment d'Espelette AOP", categorie: "Épices", uniteAchat: "Pot 50g", uniteRecette: "Gramme", facteurConversion: 50, uniteBase: "Gramme", prixUnitaireBase: 0.18, prixAchatUnitaire: 9.0 },
    { nom: "Tomates Grappes", categorie: "Légumes", uniteAchat: "Cagette 5Kg", uniteRecette: "Gramme", facteurConversion: 5000, uniteBase: "Kg", prixUnitaireBase: 2.50, prixAchatUnitaire: 12.50 },
    { nom: "Poivrons Rouges", categorie: "Légumes", uniteAchat: "Kg", uniteRecette: "Gramme", facteurConversion: 1000, uniteBase: "Kg", prixUnitaireBase: 3.80, prixAchatUnitaire: 3.80 },
    { nom: "Huile d'Olive Vierge", categorie: "Épicerie", uniteAchat: "Bidon 5L", uniteRecette: "Centilitre", facteurConversion: 500, uniteBase: "L", prixUnitaireBase: 12.0, prixAchatUnitaire: 60.0 },
    { nom: "Champignons de Paris", categorie: "Légumes", uniteAchat: "Kg", uniteRecette: "Gramme", facteurConversion: 1000, uniteBase: "Kg", prixUnitaireBase: 4.50, prixAchatUnitaire: 4.50 }
  ];

  const articles = {};
  for (const item of articlesData) {
    const art = await prisma.article.create({ data: item });
    articles[item.nom] = art;
  }
  console.log("✓ 20 articles de base créés.");


  // 5. Créer 5 Fiches Techniques (Recettes)
  // Recette 1 : Risotto de Saint-Jacques au Safran
  const recetteRisotto = await prisma.ficheTechnique.create({
    data: { nomRecette: "Risotto de Saint-Jacques au Safran", categoriePlat: "Plat" }
  });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteRisotto.id, articleId: articles["Riz Arborio Premium"].id, quantiteNecessaireUniteBase: 0.080 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteRisotto.id, articleId: articles["Noix de Saint-Jacques"].id, quantiteNecessaireUniteBase: 4.0 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteRisotto.id, articleId: articles["Safran en filaments"].id, quantiteNecessaireUniteBase: 0.05 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteRisotto.id, articleId: articles["Beurre Doux Gastronomique"].id, quantiteNecessaireUniteBase: 0.020 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteRisotto.id, articleId: articles["Crème Liquide 35%"].id, quantiteNecessaireUniteBase: 0.05 } });

  // Recette 2 : Filet de Canard aux Figues
  const recetteCanard = await prisma.ficheTechnique.create({
    data: { nomRecette: "Filet de Canard aux Figues", categoriePlat: "Plat" }
  });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCanard.id, articleId: articles["Magret de Canard"].id, quantiteNecessaireUniteBase: 0.180 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCanard.id, articleId: articles["Figues Fraîches"].id, quantiteNecessaireUniteBase: 3.0 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCanard.id, articleId: articles["Miel d'Acacia"].id, quantiteNecessaireUniteBase: 0.015 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCanard.id, articleId: articles["Beurre Doux Gastronomique"].id, quantiteNecessaireUniteBase: 0.010 } });

  // Recette 3 : Plateau Cocktail Prestige (Foie Gras & Pain d'Épices)
  const recetteCocktail = await prisma.ficheTechnique.create({
    data: { nomRecette: "Plateau Cocktail Prestige (Amuse-bouches)", categoriePlat: "Entrée" }
  });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCocktail.id, articleId: articles["Foie Gras de Canard"].id, quantiteNecessaireUniteBase: 0.020 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteCocktail.id, articleId: articles["Pain d'Épices Artisanal"].id, quantiteNecessaireUniteBase: 1.0 } });

  // Recette 4 : Entremets Chocolat & Piment d'Espelette
  const recetteChocolat = await prisma.ficheTechnique.create({
    data: { nomRecette: "Entremets Chocolat & Piment d'Espelette", categoriePlat: "Dessert" }
  });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteChocolat.id, articleId: articles["Chocolat Noir 70%"].id, quantiteNecessaireUniteBase: 0.060 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteChocolat.id, articleId: articles["Piment d'Espelette AOP"].id, quantiteNecessaireUniteBase: 1.0 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteChocolat.id, articleId: articles["Crème Liquide 35%"].id, quantiteNecessaireUniteBase: 0.06 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteChocolat.id, articleId: articles["Beurre Doux Gastronomique"].id, quantiteNecessaireUniteBase: 0.015 } });

  // Recette 5 : Soupe Glacée de Légumes du Soleil
  const recetteSoupe = await prisma.ficheTechnique.create({
    data: { nomRecette: "Soupe Glacée de Légumes du Soleil", categoriePlat: "Entrée" }
  });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteSoupe.id, articleId: articles["Tomates Grappes"].id, quantiteNecessaireUniteBase: 0.150 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteSoupe.id, articleId: articles["Poivrons Rouges"].id, quantiteNecessaireUniteBase: 0.050 } });
  await prisma.ficheTechniqueLigne.create({ data: { ficheTechniqueId: recetteSoupe.id, articleId: articles["Huile d'Olive Vierge"].id, quantiteNecessaireUniteBase: 0.02 } });

  console.log("✓ 5 fiches techniques prestigieuses créées.");

  // 6. Créer les profils d'employés
  const commis = await prisma.employeOuProfil.create({
    data: { nomOuType: "Jean commis de cuisine", role: "Commis", coutHoraireCharge: 22.50 }
  });
  const chef = await prisma.employeOuProfil.create({
    data: { nomOuType: "Paul Chef traiteur", role: "Administratif", coutHoraireCharge: 45.00 }
  });
  console.log("✓ Profils d'employés et coûts horaires chargés.");

  // 7. Événement 1 : TRÈS RENTABLE (Gala de Prestige Éco-Tech 🌿)
  const devisGala = await prisma.evenementDevis.create({
    data: {
      nomClient: "Gala de Prestige Éco-Tech 🌿",
      dateEvenement: new Date("2026-06-18T19:30:00Z"),
      chiffreAffairesSaisi: 12000.0,
      chiffreAffairesSaisiPrevu: 12000.0,
      chiffreAffairesSaisiReel: 13500.0 // Sur-facturé ou ventes additionnelles de dernière minute !
    }
  });

  // Associer les recettes de luxe via le nouveau modèle hiérarchique Lots -> Prestations -> Lignes Produit
  // Lot 1 : Cocktail Dînatoire
  const lotCocktail = await prisma.devisLot.create({
    data: { evenementDevisId: devisGala.id, nom: "Cocktail Dînatoire" }
  });

  // Prestation 1 : Ateliers Culinaires
  const prestAteliers = await prisma.devisPrestation.create({
    data: { devisLotId: lotCocktail.id, nom: "Ateliers Culinaires" }
  });
  await prisma.devisLigneProduit.create({
    data: {
      devisLotId: lotCocktail.id,
      devisPrestationId: prestAteliers.id,
      ficheTechniqueId: recetteRisotto.id,
      quantitePrevue: 150,
      prixUnitaireFige: await getIngredientsCost(recetteRisotto.id)
    }
  });

  // Prestation 2 : Buffet Chaud
  const prestBuffet = await prisma.devisPrestation.create({
    data: { devisLotId: lotCocktail.id, nom: "Buffet Chaud" }
  });
  await prisma.devisLigneProduit.create({
    data: {
      devisLotId: lotCocktail.id,
      devisPrestationId: prestBuffet.id,
      ficheTechniqueId: recetteCanard.id,
      quantitePrevue: 150,
      prixUnitaireFige: await getIngredientsCost(recetteCanard.id)
    }
  });

  // Lot 2 : Desserts & Sucrés (directement attaché, pas de sous-prestation)
  const lotDesserts = await prisma.devisLot.create({
    data: { evenementDevisId: devisGala.id, nom: "Desserts & Sucrés" }
  });
  await prisma.devisLigneProduit.create({
    data: {
      devisLotId: lotDesserts.id,
      devisPrestationId: null,
      ficheTechniqueId: recetteChocolat.id,
      quantitePrevue: 150,
      prixUnitaireFige: await getIngredientsCost(recetteChocolat.id)
    }
  });

  // Main d'oeuvre optimisée (20 heures commis, 12 heures chef)
  await prisma.tempsTravailEvenement.create({ data: { evenementDevisId: devisGala.id, employeId: commis.id, totalHeuresPrepareesEtJourJ: 20.0, coutTotalMainOeuvre: 20.0 * 22.50 } });
  await prisma.tempsTravailEvenement.create({ data: { evenementDevisId: devisGala.id, employeId: chef.id, totalHeuresPrepareesEtJourJ: 12.0, coutTotalMainOeuvre: 12.0 * 45.00 } });

  // Frais externes modérés
  await prisma.fraisExterne.create({ data: { evenementDevisId: devisGala.id, categorie: "Mobilier & Verres", montantHT: 600.0 } });
  await prisma.fraisExterne.create({ data: { evenementDevisId: devisGala.id, categorie: "Logistique Réfrigérée", montantHT: 150.0 } });

  // Événement 2 : PEU RENTABLE / DÉFICITAIRE (Buffet Solidaire de Quartier 🎪)
  const devisBuffet = await prisma.evenementDevis.create({
    data: {
      nomClient: "Buffet Solidaire de Quartier 🎪",
      dateEvenement: new Date("2026-05-25T12:00:00Z"),
      chiffreAffairesSaisi: 1500.0,
      chiffreAffairesSaisiPrevu: 1500.0,
      chiffreAffairesSaisiReel: 1400.0 // Moins de participants réels payants
    }
  });

  // Associer les recettes (120 convives, directement attachées à un Lot sans sous-prestation)
  const lotBuffetTraiteur = await prisma.devisLot.create({
    data: { evenementDevisId: devisBuffet.id, nom: "Buffet Traiteur" }
  });
  await prisma.devisLigneProduit.create({
    data: {
      devisLotId: lotBuffetTraiteur.id,
      devisPrestationId: null,
      ficheTechniqueId: recetteSoupe.id,
      quantitePrevue: 120,
      prixUnitaireFige: await getIngredientsCost(recetteSoupe.id)
    }
  });
  await prisma.devisLigneProduit.create({
    data: {
      devisLotId: lotBuffetTraiteur.id,
      devisPrestationId: null,
      ficheTechniqueId: recetteCocktail.id,
      quantitePrevue: 120,
      prixUnitaireFige: await getIngredientsCost(recetteCocktail.id)
    }
  });

  // Main d'oeuvre élevée (temps de montage important)
  await prisma.tempsTravailEvenement.create({ data: { evenementDevisId: devisBuffet.id, employeId: commis.id, totalHeuresPrepareesEtJourJ: 25.0, coutTotalMainOeuvre: 25.0 * 22.50 } });
  await prisma.tempsTravailEvenement.create({ data: { evenementDevisId: devisBuffet.id, employeId: chef.id, totalHeuresPrepareesEtJourJ: 15.0, coutTotalMainOeuvre: 15.0 * 45.00 } });

  // Frais externes élevés par rapport au CA
  await prisma.fraisExterne.create({ data: { evenementDevisId: devisBuffet.id, categorie: "Location Stand & Sono", montantHT: 300.0 } });
  await prisma.fraisExterne.create({ data: { evenementDevisId: devisBuffet.id, categorie: "Gobelets & Vaisselle", montantHT: 100.0 } });

  console.log("✓ Devis contrastés (très rentable vs peu rentable) créés.");
  console.log("✓ Base de données SQLite prête pour utilisation !");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
