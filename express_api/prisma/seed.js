/**
 * CANNELLE ET PIMENT — Seed Data
 * 18-month financial history: Jan 2023 - Jun 2024
 * Act 1 (Jan-Jun 2023): High variance, uncontrolled costs
 * Act 2 (Jul-Dec 2023): Cost Freeze implementation, normalization
 * Act 3 (Jan-Jun 2024): Stabilized margins, TDABC mastered
 */

try { require('dotenv').config(); } catch (e) {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Purging database...');

  await prisma.analyseRentabilite.deleteMany({});
  await prisma.fraisExterne.deleteMany({});
  await prisma.tempsTravailEvenement.deleteMany({});
  await prisma.devisLigneProduit.deleteMany({});
  await prisma.devisPrestation.deleteMany({});
  await prisma.devisLot.deleteMany({});
  await prisma.evenementDevis.deleteMany({});
  await prisma.ficheTechniqueLigne.deleteMany({});
  await prisma.ficheTechnique.deleteMany({});
  await prisma.achatFacture.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.employeOuProfil.deleteMany({});

  console.log('Seeding configuration...');

  // Configuration globale
  await prisma.configurationGlobale.upsert({
    where: { id: 'single-config-row' },
    update: { quotePartChargesTraiteurPourcentage: 80.0, tauxPerteForfaitaireDefaut: 3.0 },
    create: { id: 'single-config-row', quotePartChargesTraiteurPourcentage: 80.0, tauxPerteForfaitaireDefaut: 3.0 }
  });

  // Parametres financiers (structure de charges fixes realiste PME traiteur)
  await prisma.parametresFinanciers.upsert({
    where: { id: 'single-financials-row' },
    update: {
      loyerAnnuel: 18000,
      electriciteAnnuelle: 4200,
      assurancesAnnuelles: 2800,
      masseSalarialeIndirecte: 42000,
      autresChargesAnnuelles: 6000,
      joursOuvertureAn: 220,
      heuresParJour: 8
    },
    create: {
      id: 'single-financials-row',
      loyerAnnuel: 18000,
      electriciteAnnuelle: 4200,
      assurancesAnnuelles: 2800,
      masseSalarialeIndirecte: 42000,
      autresChargesAnnuelles: 6000,
      joursOuvertureAn: 220,
      heuresParJour: 8
    }
  });
  // cout horaire labo = (18000+4200+2800+42000+6000) / (220*8) = 73000/1760 = 41.48 EUR/h

  console.log('Seeding articles (ingredients)...');

  const articles = await Promise.all([
    // Viandes & Volailles
    prisma.article.create({ data: { nom: 'Magret de canard', categorie: 'VIANDES_ET_VOLAILLES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 22.50, prixAchatUnitaire: 22.50, familleRSE: 'Viandes', classificationRSE: 'Local' } }),
    prisma.article.create({ data: { nom: 'Poulet fermier Label Rouge', categorie: 'VIANDES_ET_VOLAILLES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 13.80, prixAchatUnitaire: 13.80, familleRSE: 'Viandes', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Filet mignon de porc', categorie: 'VIANDES_ET_VOLAILLES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 16.40, prixAchatUnitaire: 16.40, familleRSE: 'Viandes', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Carre agneau', categorie: 'VIANDES_ET_VOLAILLES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 29.90, prixAchatUnitaire: 29.90, familleRSE: 'Viandes', classificationRSE: 'Bio' } }),
    // Poissons & Crustaces
    prisma.article.create({ data: { nom: 'Saumon frais portion', categorie: 'POISSONS_ET_CRUSTACES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 19.20, prixAchatUnitaire: 19.20, familleRSE: 'Poissons', classificationRSE: 'Local' } }),
    prisma.article.create({ data: { nom: 'Saint-Jacques noisettes', categorie: 'POISSONS_ET_CRUSTACES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 48.00, prixAchatUnitaire: 48.00, familleRSE: 'Poissons', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Cabillaud filet', categorie: 'POISSONS_ET_CRUSTACES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 15.60, prixAchatUnitaire: 15.60, familleRSE: 'Poissons', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Gambas royales', categorie: 'POISSONS_ET_CRUSTACES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 32.00, prixAchatUnitaire: 32.00, familleRSE: 'Poissons', classificationRSE: 'Standard' } }),
    // Produits laitiers
    prisma.article.create({ data: { nom: 'Creme fraiche epaisse', categorie: 'PRODUITS_LAITIERS', uniteAchat: 'L', uniteRecette: 'L', facteurConversion: 1, uniteBase: 'L', prixUnitaireBase: 4.80, prixAchatUnitaire: 4.80, familleRSE: 'Laitiers', classificationRSE: 'Bio' } }),
    prisma.article.create({ data: { nom: 'Beurre doux AOP Charentes', categorie: 'PRODUITS_LAITIERS', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 13.20, prixAchatUnitaire: 13.20, familleRSE: 'Laitiers', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Comte 24 mois', categorie: 'PRODUITS_LAITIERS', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 27.50, prixAchatUnitaire: 27.50, familleRSE: 'Laitiers', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Mascarpone', categorie: 'PRODUITS_LAITIERS', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 6.40, prixAchatUnitaire: 6.40, familleRSE: 'Laitiers', classificationRSE: 'Standard' } }),
    // Fruits & Legumes
    prisma.article.create({ data: { nom: 'Tomates cerises cocktail', categorie: 'FRUITS_ET_LEGUMES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 5.20, prixAchatUnitaire: 5.20, familleRSE: 'Legumes', classificationRSE: 'Bio' } }),
    prisma.article.create({ data: { nom: 'Asperges vertes', categorie: 'FRUITS_ET_LEGUMES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 8.80, prixAchatUnitaire: 8.80, familleRSE: 'Legumes', classificationRSE: 'Local' } }),
    prisma.article.create({ data: { nom: 'Champignons de Paris', categorie: 'FRUITS_ET_LEGUMES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 4.20, prixAchatUnitaire: 4.20, familleRSE: 'Legumes', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Pommes de terre grenaille', categorie: 'FRUITS_ET_LEGUMES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 2.60, prixAchatUnitaire: 2.60, familleRSE: 'Legumes', classificationRSE: 'Local' } }),
    prisma.article.create({ data: { nom: 'Carottes bio', categorie: 'FRUITS_ET_LEGUMES', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 2.10, prixAchatUnitaire: 2.10, familleRSE: 'Legumes', classificationRSE: 'Bio' } }),
    // Epicerie
    prisma.article.create({ data: { nom: 'Riz arborio', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 3.60, prixAchatUnitaire: 3.60, familleRSE: 'Epicerie', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Huile olive vierge extra', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'L', uniteRecette: 'L', facteurConversion: 1, uniteBase: 'L', prixUnitaireBase: 12.80, prixAchatUnitaire: 12.80, familleRSE: 'Epicerie', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Fond de veau brun', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 8.40, prixAchatUnitaire: 8.40, familleRSE: 'Epicerie', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Moutarde de Dijon', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 5.20, prixAchatUnitaire: 5.20, familleRSE: 'Epicerie', classificationRSE: 'Labellise' } }),
    prisma.article.create({ data: { nom: 'Safran pistils', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 3200.00, prixAchatUnitaire: 3200.00, familleRSE: 'Epicerie', classificationRSE: 'Local' } }),
    prisma.article.create({ data: { nom: 'Farine T55', categorie: 'EPICERIE_ET_SEC', uniteAchat: 'Kg', uniteRecette: 'Kg', facteurConversion: 1, uniteBase: 'Kg', prixUnitaireBase: 1.30, prixAchatUnitaire: 1.30, familleRSE: 'Epicerie', classificationRSE: 'Standard' } }),
    // Boissons
    prisma.article.create({ data: { nom: 'Champagne brut NV', categorie: 'BOISSONS', uniteAchat: 'L', uniteRecette: 'L', facteurConversion: 1, uniteBase: 'L', prixUnitaireBase: 18.00, prixAchatUnitaire: 18.00, familleRSE: 'Boissons', classificationRSE: 'Standard' } }),
    prisma.article.create({ data: { nom: 'Vin blanc Chablis 1er cru', categorie: 'BOISSONS', uniteAchat: 'L', uniteRecette: 'L', facteurConversion: 1, uniteBase: 'L', prixUnitaireBase: 9.50, prixAchatUnitaire: 9.50, familleRSE: 'Boissons', classificationRSE: 'Local' } }),
  ]);

  // Index articles by name for easy reference
  const art = {};
  articles.forEach(a => { art[a.nom] = a; });

  console.log(`Created ${articles.length} articles`);
  console.log('Seeding fiches techniques (recettes)...');

  // 12 fiches techniques
  const ft = {};

  // 1. Risotto Saint-Jacques au Safran (Plat signature)
  const ftRisotto = await prisma.ficheTechnique.create({ data: { nomRecette: 'Risotto Saint-Jacques au Safran', categoriePlat: 'PLAT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftRisotto.id, articleId: art['Riz arborio'].id, quantiteNecessaireUniteBase: 0.080 },
    { ficheTechniqueId: ftRisotto.id, articleId: art['Saint-Jacques noisettes'].id, quantiteNecessaireUniteBase: 0.120 },
    { ficheTechniqueId: ftRisotto.id, articleId: art['Safran pistils'].id, quantiteNecessaireUniteBase: 0.0002 },
    { ficheTechniqueId: ftRisotto.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.040 },
    { ficheTechniqueId: ftRisotto.id, articleId: art['Beurre doux AOP Charentes'].id, quantiteNecessaireUniteBase: 0.020 },
    { ficheTechniqueId: ftRisotto.id, articleId: art['Comte 24 mois'].id, quantiteNecessaireUniteBase: 0.030 },
  ] });
  ft.risotto = ftRisotto;
  // cout portion: 0.08*3.60 + 0.12*48 + 0.0002*3200 + 0.04*4.80 + 0.02*13.20 + 0.03*27.50
  // = 0.288 + 5.76 + 0.64 + 0.192 + 0.264 + 0.825 = 7.97 EUR/portion

  // 2. Magret de canard sauce orange
  const ftMagret = await prisma.ficheTechnique.create({ data: { nomRecette: 'Magret de canard sauce bigarade', categoriePlat: 'PLAT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftMagret.id, articleId: art['Magret de canard'].id, quantiteNecessaireUniteBase: 0.180 },
    { ficheTechniqueId: ftMagret.id, articleId: art['Fond de veau brun'].id, quantiteNecessaireUniteBase: 0.060 },
    { ficheTechniqueId: ftMagret.id, articleId: art['Beurre doux AOP Charentes'].id, quantiteNecessaireUniteBase: 0.015 },
    { ficheTechniqueId: ftMagret.id, articleId: art['Pommes de terre grenaille'].id, quantiteNecessaireUniteBase: 0.120 },
  ] });
  ft.magret = ftMagret;
  // cout = 0.18*22.50 + 0.06*8.40 + 0.015*13.20 + 0.12*2.60 = 4.05+0.504+0.198+0.312 = 5.06 EUR/portion

  // 3. Tartare de saumon aux agrumes
  const ftTartare = await prisma.ficheTechnique.create({ data: { nomRecette: 'Tartare de saumon aux agrumes', categoriePlat: 'ENTREE' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftTartare.id, articleId: art['Saumon frais portion'].id, quantiteNecessaireUniteBase: 0.090 },
    { ficheTechniqueId: ftTartare.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.020 },
    { ficheTechniqueId: ftTartare.id, articleId: art['Moutarde de Dijon'].id, quantiteNecessaireUniteBase: 0.010 },
    { ficheTechniqueId: ftTartare.id, articleId: art['Huile olive vierge extra'].id, quantiteNecessaireUniteBase: 0.008 },
  ] });
  ft.tartare = ftTartare;
  // cout = 0.09*19.20 + 0.02*4.80 + 0.01*5.20 + 0.008*12.80 = 1.728+0.096+0.052+0.1024 = 1.978 EUR/portion

  // 4. Veloute d'asperges vertes
  const ftAsperges = await prisma.ficheTechnique.create({ data: { nomRecette: 'Veloute d asperges vertes crème fouettée', categoriePlat: 'ENTREE' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftAsperges.id, articleId: art['Asperges vertes'].id, quantiteNecessaireUniteBase: 0.100 },
    { ficheTechniqueId: ftAsperges.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.040 },
    { ficheTechniqueId: ftAsperges.id, articleId: art['Beurre doux AOP Charentes'].id, quantiteNecessaireUniteBase: 0.015 },
  ] });
  ft.asperges = ftAsperges;

  // 5. Carre d'agneau en croute d'herbes
  const ftAgneau = await prisma.ficheTechnique.create({ data: { nomRecette: 'Carré agneau bio en croûte d herbes', categoriePlat: 'PLAT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftAgneau.id, articleId: art['Carre agneau'].id, quantiteNecessaireUniteBase: 0.200 },
    { ficheTechniqueId: ftAgneau.id, articleId: art['Fond de veau brun'].id, quantiteNecessaireUniteBase: 0.050 },
    { ficheTechniqueId: ftAgneau.id, articleId: art['Tomates cerises cocktail'].id, quantiteNecessaireUniteBase: 0.060 },
    { ficheTechniqueId: ftAgneau.id, articleId: art['Huile olive vierge extra'].id, quantiteNecessaireUniteBase: 0.010 },
  ] });
  ft.agneau = ftAgneau;
  // cout = 0.20*29.90 + 0.05*8.40 + 0.06*5.20 + 0.01*12.80 = 5.98+0.42+0.312+0.128 = 6.84 EUR/portion

  // 6. Filet mignon en croute
  const ftFilet = await prisma.ficheTechnique.create({ data: { nomRecette: 'Filet mignon en croûte champignons', categoriePlat: 'PLAT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftFilet.id, articleId: art['Filet mignon de porc'].id, quantiteNecessaireUniteBase: 0.200 },
    { ficheTechniqueId: ftFilet.id, articleId: art['Champignons de Paris'].id, quantiteNecessaireUniteBase: 0.080 },
    { ficheTechniqueId: ftFilet.id, articleId: art['Fond de veau brun'].id, quantiteNecessaireUniteBase: 0.040 },
    { ficheTechniqueId: ftFilet.id, articleId: art['Farine T55'].id, quantiteNecessaireUniteBase: 0.030 },
    { ficheTechniqueId: ftFilet.id, articleId: art['Beurre doux AOP Charentes'].id, quantiteNecessaireUniteBase: 0.020 },
  ] });
  ft.filet = ftFilet;
  // cout = 0.20*16.40 + 0.08*4.20 + 0.04*8.40 + 0.03*1.30 + 0.02*13.20 = 3.28+0.336+0.336+0.039+0.264 = 4.255 EUR/portion

  // 7. Tiramisu mascarpone cafe
  const ftTiramisu = await prisma.ficheTechnique.create({ data: { nomRecette: 'Tiramisu café mascarpone maison', categoriePlat: 'DESSERT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftTiramisu.id, articleId: art['Mascarpone'].id, quantiteNecessaireUniteBase: 0.080 },
    { ficheTechniqueId: ftTiramisu.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.030 },
    { ficheTechniqueId: ftTiramisu.id, articleId: art['Farine T55'].id, quantiteNecessaireUniteBase: 0.020 },
  ] });
  ft.tiramisu = ftTiramisu;

  // 8. Poulet fermier roti et ses legumes
  const ftPoulet = await prisma.ficheTechnique.create({ data: { nomRecette: 'Poulet fermier rôti jus court légumes', categoriePlat: 'PLAT' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftPoulet.id, articleId: art['Poulet fermier Label Rouge'].id, quantiteNecessaireUniteBase: 0.200 },
    { ficheTechniqueId: ftPoulet.id, articleId: art['Carottes bio'].id, quantiteNecessaireUniteBase: 0.080 },
    { ficheTechniqueId: ftPoulet.id, articleId: art['Pommes de terre grenaille'].id, quantiteNecessaireUniteBase: 0.100 },
    { ficheTechniqueId: ftPoulet.id, articleId: art['Beurre doux AOP Charentes'].id, quantiteNecessaireUniteBase: 0.015 },
    { ficheTechniqueId: ftPoulet.id, articleId: art['Fond de veau brun'].id, quantiteNecessaireUniteBase: 0.030 },
  ] });
  ft.poulet = ftPoulet;
  // cout = 0.20*13.80 + 0.08*2.10 + 0.10*2.60 + 0.015*13.20 + 0.03*8.40 = 2.76+0.168+0.26+0.198+0.252 = 3.638 EUR/portion

  // 9. Verrine saumon fumé comte
  const ftVerrine = await prisma.ficheTechnique.create({ data: { nomRecette: 'Verrine saumon fumé comté 24 mois', categoriePlat: 'COCKTAIL' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftVerrine.id, articleId: art['Saumon frais portion'].id, quantiteNecessaireUniteBase: 0.040 },
    { ficheTechniqueId: ftVerrine.id, articleId: art['Comte 24 mois'].id, quantiteNecessaireUniteBase: 0.020 },
    { ficheTechniqueId: ftVerrine.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.015 },
  ] });
  ft.verrine = ftVerrine;
  // cout = 0.04*19.20 + 0.02*27.50 + 0.015*4.80 = 0.768+0.55+0.072 = 1.39 EUR/piece

  // 10. Mini-brochettes gambas plancha
  const ftGambas = await prisma.ficheTechnique.create({ data: { nomRecette: 'Mini-brochettes gambas plancha', categoriePlat: 'COCKTAIL' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftGambas.id, articleId: art['Gambas royales'].id, quantiteNecessaireUniteBase: 0.060 },
    { ficheTechniqueId: ftGambas.id, articleId: art['Tomates cerises cocktail'].id, quantiteNecessaireUniteBase: 0.020 },
    { ficheTechniqueId: ftGambas.id, articleId: art['Huile olive vierge extra'].id, quantiteNecessaireUniteBase: 0.005 },
  ] });
  ft.gambas = ftGambas;
  // cout = 0.06*32 + 0.02*5.20 + 0.005*12.80 = 1.92+0.104+0.064 = 2.088 EUR/piece

  // 11. Assiette buffet froid mer
  const ftBuffetMer = await prisma.ficheTechnique.create({ data: { nomRecette: 'Assiette buffet froid poissons', categoriePlat: 'BUFFET' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftBuffetMer.id, articleId: art['Saumon frais portion'].id, quantiteNecessaireUniteBase: 0.080 },
    { ficheTechniqueId: ftBuffetMer.id, articleId: art['Cabillaud filet'].id, quantiteNecessaireUniteBase: 0.060 },
    { ficheTechniqueId: ftBuffetMer.id, articleId: art['Creme fraiche epaisse'].id, quantiteNecessaireUniteBase: 0.020 },
    { ficheTechniqueId: ftBuffetMer.id, articleId: art['Moutarde de Dijon'].id, quantiteNecessaireUniteBase: 0.008 },
  ] });
  ft.buffetMer = ftBuffetMer;

  // 12. Plateau fromages affinés
  const ftFromages = await prisma.ficheTechnique.create({ data: { nomRecette: 'Plateau fromages affinés sélection', categoriePlat: 'BUFFET' } });
  await prisma.ficheTechniqueLigne.createMany({ data: [
    { ficheTechniqueId: ftFromages.id, articleId: art['Comte 24 mois'].id, quantiteNecessaireUniteBase: 0.050 },
  ] });
  ft.fromages = ftFromages;

  console.log('Seeding employes...');

  const employes = await Promise.all([
    prisma.employeOuProfil.create({ data: { nomOuType: 'Thomas Mercier', role: 'COMMIS', coutHoraireCharge: 29.50 } }),
    prisma.employeOuProfil.create({ data: { nomOuType: 'Marie Leblanc', role: 'COMMIS', coutHoraireCharge: 23.80 } }),
    prisma.employeOuProfil.create({ data: { nomOuType: 'Antoine Moreau', role: 'COMMIS', coutHoraireCharge: 17.20 } }),
    prisma.employeOuProfil.create({ data: { nomOuType: 'Lucie Favre', role: 'SERVEUR', coutHoraireCharge: 14.80 } }),
    prisma.employeOuProfil.create({ data: { nomOuType: 'Marc Bertrand', role: 'SERVEUR', coutHoraireCharge: 14.80 } }),
  ]);
  const emp = {};
  employes.forEach(e => { emp[e.nomOuType] = e; });
  console.log(`Created ${employes.length} employes`);

  console.log('Seeding events (14 evenements sur 18 mois)...');

  // Helper to create a full event with lot, lignes, temps travail, frais, and analysis
  async function createEvent({ nomClient, date, ca, status, tempsProduction, lignes, temps, frais, analyse }) {
    const ev = await prisma.evenementDevis.create({
      data: {
        nomClient,
        dateEvenement: new Date(date),
        chiffreAffairesSaisi: ca,
        chiffreAffairesSaisiPrevu: analyse.caPrevu || ca,
        chiffreAffairesSaisiReel: analyse.caReel || ca,
        status,
        tempsProductionEstimeHeures: tempsProduction
      }
    });

    // Create main lot
    const lot = await prisma.devisLot.create({ data: { evenementDevisId: ev.id, nom: 'Prestations' } });

    // Add product lines
    for (const l of lignes) {
      await prisma.devisLigneProduit.create({
        data: {
          devisLotId: lot.id,
          ficheTechniqueId: l.ftId,
          quantitePrevue: l.qty,
          prixUnitaireFige: l.prixFige || 0
        }
      });
    }

    // Add labor
    for (const t of temps) {
      await prisma.tempsTravailEvenement.create({
        data: {
          evenementDevisId: ev.id,
          employeId: t.empId,
          totalHeuresPrepareesEtJourJ: t.heures,
          prixUnitaireFige: t.tauxFige,
          coutTotalMainOeuvre: t.heures * t.tauxFige
        }
      });
    }

    // Add external costs
    for (const f of frais) {
      await prisma.fraisExterne.create({
        data: { evenementDevisId: ev.id, categorie: f.cat, montantHT: f.montant }
      });
    }

    // Persist analysis
    await prisma.analyseRentabilite.create({
      data: {
        evenementDevisId: ev.id,
        totalCoutMatiere: analyse.coutMatiere,
        totalMainOeuvreDirecte: analyse.coutMOD,
        totalFraisExternes: analyse.coutFrais,
        margeBruteHT: (analyse.caReel || ca) - analyse.coutMatiere,
        quotePartFraisFixes: analyse.fraisFixes || 0,
        tauxPerteForfaitaire: analyse.tauxPerte || 3.0,
        tauxPerteSaisi: null,
        coutPerteAlimentaire: Math.round(analyse.coutMatiere * (analyse.tauxPerte || 3.0) / 100 * 100) / 100,
        margeNetteHT: (analyse.caReel || ca) - analyse.coutMatiere - (analyse.fraisFixes || 0),
        coutRevientParConvive: analyse.coutRevientParConvive || 0,
        coutMatierePrevu: analyse.coutMatierePrevu || analyse.coutMatiere,
        coutMatiereReel: analyse.coutMatiereReel || analyse.coutMatiere,
        coutMainOeuvrePrevu: analyse.coutMODPrevu || analyse.coutMOD,
        coutMainOeuvreReel: analyse.coutMODReel || analyse.coutMOD
      }
    });

    return ev;
  }

  // ===========================================================================
  // ACTE 1 — Jan-Jun 2023 : Variance forte, marges non maitrisees
  // ===========================================================================

  // Ev1 — Cocktail Cabinet Lemercier (Feb 2023) — Marge 16% : dérapage coût matière
  await createEvent({
    nomClient: 'Cabinet Lemercier & Associés — Cocktail Dînatoire',
    date: '2023-02-09',
    ca: 9200,
    status: 'Termine',
    tempsProduction: 18,
    lignes: [
      { ftId: ft.verrine.id, qty: 180, prixFige: 1.39 },
      { ftId: ft.gambas.id,  qty: 180, prixFige: 2.09 },
      { ftId: ft.tartare.id, qty: 60,  prixFige: 1.98 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 10, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 8,  tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 8,  tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 6,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 6,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location vaisselle cocktail', montant: 680 },
      { cat: 'Transport livraison', montant: 280 },
    ],
    analyse: {
      caReel: 9200, caPrevu: 9200,
      coutMatiere: 4120,   // 44.8% — dérapage (non normé)
      coutMatierePrevu: 2800, coutMatiereReel: 4120,
      coutMOD: 1049.6,     // Thomas 10h + Marie 8h + Antoine 8h + Lucie 6h + Marc 6h
      coutMODPrevu: 900, coutMODReel: 1049.6,
      coutFrais: 960,
      fraisFixes: 124.44,  // 3h * 41.48
      tauxPerte: 6.0,       // gaspillage élevé non maîtrisé
      coutRevientParConvive: 29.80
    }
  });

  // Ev2 — Mariage Fontaine (Mar 2023) — Marge 44%
  await createEvent({
    nomClient: 'Mariage Fontaine & Guerrier',
    date: '2023-03-18',
    ca: 13500,
    status: 'Termine',
    tempsProduction: 22,
    lignes: [
      { ftId: ft.tartare.id,  qty: 120, prixFige: 1.98 },
      { ftId: ft.asperges.id, qty: 120, prixFige: 1.24 },
      { ftId: ft.magret.id,   qty: 120, prixFige: 5.06 },
      { ftId: ft.tiramisu.id, qty: 120, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 12, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 10, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 10, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 8,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 8,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location nappage lin', montant: 450 },
      { cat: 'Transport traiteur', montant: 320 },
      { cat: 'Fleurs de table', montant: 180 },
    ],
    analyse: {
      caReel: 13500, caPrevu: 13500,
      coutMatiere: 1041.6,  // (1.98+1.24+5.06+0.70)*120 = 8.98*120 = 1077.6, arrondi
      coutMatierePrevu: 1080, coutMatiereReel: 1041.6,
      coutMOD: 927.6,
      coutMODPrevu: 950, coutMODReel: 927.6,
      coutFrais: 950,
      fraisFixes: 165.92,
      tauxPerte: 4.5,
      coutRevientParConvive: 19.05
    }
  });

  // Ev3 — Seminaire Altura (Apr 2023) — Marge 61% (event simple, marges élevées)
  await createEvent({
    nomClient: 'Groupe Altura Architecture — Séminaire Annuel',
    date: '2023-04-20',
    ca: 7200,
    status: 'Termine',
    tempsProduction: 10,
    lignes: [
      { ftId: ft.asperges.id, qty: 60, prixFige: 1.24 },
      { ftId: ft.poulet.id,   qty: 60, prixFige: 3.64 },
      { ftId: ft.tiramisu.id, qty: 60, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 6, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 5, tauxFige: 23.80 },
      { empId: emp['Lucie Favre'].id,    heures: 4, tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location mobilier', montant: 280 },
    ],
    analyse: {
      caReel: 7200, caPrevu: 7200,
      coutMatiere: 334.8,
      coutMatierePrevu: 340, coutMatiereReel: 334.8,
      coutMOD: 355.8,
      coutMODPrevu: 360, coutMODReel: 355.8,
      coutFrais: 280,
      fraisFixes: 124.44,
      tauxPerte: 3.5,
      coutRevientParConvive: 18.25
    }
  });

  // Ev4 — Gala Association (May 2023) — Marge 19% (dérapage sur grand event)
  await createEvent({
    nomClient: 'Association Espoir Santé — Soirée Caritative',
    date: '2023-05-13',
    ca: 22000,
    status: 'Termine',
    tempsProduction: 32,
    lignes: [
      { ftId: ft.verrine.id,     qty: 350, prixFige: 1.39 },
      { ftId: ft.gambas.id,      qty: 350, prixFige: 2.09 },
      { ftId: ft.tartare.id,     qty: 350, prixFige: 1.98 },
      { ftId: ft.magret.id,      qty: 350, prixFige: 5.06 },
      { ftId: ft.tiramisu.id,    qty: 350, prixFige: 0.70 },
      { ftId: ft.fromages.id,    qty: 350, prixFige: 1.38 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 16, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 14, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 14, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 12, tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 12, tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location salle Palais des Congrès', montant: 2800 },
      { cat: 'Location vaisselle prestige', montant: 1200 },
      { cat: 'Sonorisation et éclairage', montant: 900 },
      { cat: 'Transport multi-véhicules', montant: 480 },
    ],
    analyse: {
      caReel: 22000, caPrevu: 22000,
      coutMatiere: 8750,   // dérapage réel sur 350pax non planifié
      coutMatierePrevu: 6200, coutMatiereReel: 8750,
      coutMOD: 1604,
      coutMODPrevu: 1400, coutMODReel: 1604,
      coutFrais: 5380,
      fraisFixes: 414.8,
      tauxPerte: 8.0,      // gaspillage massif non contrôlé
      coutRevientParConvive: 41.26
    }
  });

  // Ev5 — Plateaux repas Horizon (Jun 2023) — Marge 38%
  await createEvent({
    nomClient: 'Atelier Horizon Design — Déjeuners d\'Équipe',
    date: '2023-06-15',
    ca: 3800,
    status: 'Termine',
    tempsProduction: 8,
    lignes: [
      { ftId: ft.poulet.id,   qty: 80, prixFige: 3.64 },
      { ftId: ft.tiramisu.id, qty: 80, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Antoine Moreau'].id, heures: 5, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 4, tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Contenants et emballages', montant: 120 },
      { cat: 'Livraison site Alstom', montant: 95 },
    ],
    analyse: {
      caReel: 3800, caPrevu: 3800,
      coutMatiere: 347.2,
      coutMatierePrevu: 360, coutMatiereReel: 347.2,
      coutMOD: 145.2,
      coutMODPrevu: 150, coutMODReel: 145.2,
      coutFrais: 215,
      fraisFixes: 82.96,
      tauxPerte: 4.0,
      coutRevientParConvive: 9.88
    }
  });

  // ===========================================================================
  // ACTE 2 — Jul-Dec 2023 : Transition — Cost Freeze progressif
  // ===========================================================================

  // Ev6 — Espace Vaise (Jul 2023) — Marge 44%
  await createEvent({
    nomClient: 'Espace Vaise Automobile — Cocktail Inauguration',
    date: '2023-07-06',
    ca: 8800,
    status: 'Termine',
    tempsProduction: 14,
    lignes: [
      { ftId: ft.verrine.id, qty: 120, prixFige: 1.39 },
      { ftId: ft.gambas.id,  qty: 120, prixFige: 2.09 },
      { ftId: ft.tartare.id, qty: 60,  prixFige: 1.98 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 8,  tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 6,  tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 6,  tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 5,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location vaisselle', montant: 420 },
      { cat: 'Transport', montant: 180 },
    ],
    analyse: {
      caReel: 8800, caPrevu: 8800,
      coutMatiere: 1254,    // normé: (1.39+2.09)*120 + 1.98*60 = 417.6+118.8 = 536.4 + stocks
      coutMatierePrevu: 1300, coutMatiereReel: 1254,
      coutMOD: 620.8,
      coutMODPrevu: 650, coutMODReel: 620.8,
      coutFrais: 600,
      fraisFixes: 165.92,
      tauxPerte: 4.5,
      coutRevientParConvive: 21.25
    }
  });

  // Ev7 — Phytovance (Sep 2023) — Marge 48% — premiere application normée
  await createEvent({
    nomClient: 'Laboratoire Phytovance — Réception Annuelle',
    date: '2023-09-14',
    ca: 18500,
    status: 'Termine',
    tempsProduction: 24,
    lignes: [
      { ftId: ft.tartare.id,  qty: 200, prixFige: 1.98 },
      { ftId: ft.asperges.id, qty: 200, prixFige: 1.24 },
      { ftId: ft.risotto.id,  qty: 200, prixFige: 7.97 },
      { ftId: ft.tiramisu.id, qty: 200, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 14, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 12, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 10, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 8,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 8,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location nappage prestige', montant: 580 },
      { cat: 'Vins et champagnes fournis', montant: 1200 },
      { cat: 'Transport livraison', montant: 280 },
    ],
    analyse: {
      caReel: 18500, caPrevu: 18500,
      coutMatiere: 2378,
      coutMatierePrevu: 2500, coutMatiereReel: 2378,
      coutMOD: 1024.4,
      coutMODPrevu: 1100, coutMODReel: 1024.4,
      coutFrais: 2060,
      fraisFixes: 248.88,
      tauxPerte: 3.5,
      coutRevientParConvive: 27.85
    }
  });

  // Ev8 — Union Professionnelle (Oct 2023) — Marge 51%
  await createEvent({
    nomClient: 'Union Professionnelle Régionale — Dîner de Clôture',
    date: '2023-10-19',
    ca: 15200,
    status: 'Termine',
    tempsProduction: 20,
    lignes: [
      { ftId: ft.tartare.id, qty: 150, prixFige: 1.98 },
      { ftId: ft.agneau.id,  qty: 150, prixFige: 6.84 },
      { ftId: ft.tiramisu.id,qty: 150, prixFige: 0.70 },
      { ftId: ft.fromages.id,qty: 150, prixFige: 1.38 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 12, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 10, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 8,  tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 7,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 7,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location vaisselle cristal', montant: 650 },
      { cat: 'Champagne accueil', montant: 480 },
      { cat: 'Décoration florale', montant: 220 },
    ],
    analyse: {
      caReel: 15200, caPrevu: 15200,
      coutMatiere: 1635,
      coutMatierePrevu: 1700, coutMatiereReel: 1635,
      coutMOD: 855.6,
      coutMODPrevu: 900, coutMODReel: 855.6,
      coutFrais: 1350,
      fraisFixes: 207.4,
      tauxPerte: 3.5,
      coutRevientParConvive: 25.59
    }
  });

  // Ev9 — Nova Brunch (Dec 2023) — Marge 55%
  await createEvent({
    nomClient: 'Agence Digitale Nova — Brunch & Team Building',
    date: '2023-12-07',
    ca: 7800,
    status: 'Termine',
    tempsProduction: 10,
    lignes: [
      { ftId: ft.verrine.id, qty: 90, prixFige: 1.39 },
      { ftId: ft.poulet.id,  qty: 90, prixFige: 3.64 },
      { ftId: ft.tiramisu.id,qty: 90, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 7,  tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 5,  tauxFige: 23.80 },
      { empId: emp['Lucie Favre'].id,    heures: 4,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Mise en place buffet', montant: 180 },
      { cat: 'Transport', montant: 120 },
    ],
    analyse: {
      caReel: 7800, caPrevu: 7800,
      coutMatiere: 512.1,
      coutMatierePrevu: 530, coutMatiereReel: 512.1,
      coutMOD: 382.5,
      coutMODPrevu: 390, coutMODReel: 382.5,
      coutFrais: 300,
      fraisFixes: 124.44,
      tauxPerte: 3.0,
      coutRevientParConvive: 15.28
    }
  });

  // ===========================================================================
  // ACTE 3 — Jan-Jun 2024 : Stabilisation — Marges 50-58%, TDABC maitrisé
  // ===========================================================================

  // Ev10 — Collectivité Territoriale (Jan 2024) — Marge 52%
  await createEvent({
    nomClient: 'Collectivité Territoriale — Soirée des Vœux 2024',
    date: '2024-01-18',
    ca: 19500,
    status: 'Termine',
    tempsProduction: 22,
    lignes: [
      { ftId: ft.verrine.id, qty: 250, prixFige: 1.39 },
      { ftId: ft.gambas.id,  qty: 250, prixFige: 2.09 },
      { ftId: ft.tartare.id, qty: 150, prixFige: 1.98 },
      { ftId: ft.magret.id,  qty: 250, prixFige: 5.06 },
      { ftId: ft.tiramisu.id,qty: 250, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 14, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 12, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 10, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 8,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 8,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location vaisselle municipale', montant: 720 },
      { cat: 'Champagne accueil officiel', montant: 850 },
      { cat: 'Transport sécurisé', montant: 380 },
    ],
    analyse: {
      caReel: 19500, caPrevu: 18800,
      coutMatiere: 2445,
      coutMatierePrevu: 2400, coutMatiereReel: 2445,
      coutMOD: 1024.4,
      coutMODPrevu: 1050, coutMODReel: 1024.4,
      coutFrais: 1950,
      fraisFixes: 165.92,
      tauxPerte: 3.0,
      coutRevientParConvive: 17.74
    }
  });

  // Ev11 — Mariage Durand (Feb 2024) — Marge 53%
  await createEvent({
    nomClient: 'Mariage Durand & Pelletier',
    date: '2024-02-10',
    ca: 16800,
    status: 'Termine',
    tempsProduction: 22,
    lignes: [
      { ftId: ft.tartare.id,  qty: 140, prixFige: 1.98 },
      { ftId: ft.asperges.id, qty: 140, prixFige: 1.24 },
      { ftId: ft.risotto.id,  qty: 140, prixFige: 7.97 },
      { ftId: ft.tiramisu.id, qty: 140, prixFige: 0.70 },
      { ftId: ft.fromages.id, qty: 140, prixFige: 1.38 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 14, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 12, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 10, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 8,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 8,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location nappage et mobilier', montant: 580 },
      { cat: 'Transport aller-retour', montant: 320 },
      { cat: 'Champagne millésimé', montant: 680 },
    ],
    analyse: {
      caReel: 16800, caPrevu: 16200,
      coutMatiere: 1861.6,
      coutMatierePrevu: 1900, coutMatiereReel: 1861.6,
      coutMOD: 1024.4,
      coutMODPrevu: 1050, coutMODReel: 1024.4,
      coutFrais: 1580,
      fraisFixes: 165.92,
      tauxPerte: 3.0,
      coutRevientParConvive: 26.07
    }
  });

  // Ev12 — BioTerra Séminaire (Mar 2024) — Marge 55%
  await createEvent({
    nomClient: 'Société BioTerra — Séminaire Stratégique',
    date: '2024-03-21',
    ca: 9200,
    status: 'Termine',
    tempsProduction: 12,
    lignes: [
      { ftId: ft.tartare.id,  qty: 80, prixFige: 1.98 },
      { ftId: ft.asperges.id, qty: 80, prixFige: 1.24 },
      { ftId: ft.filet.id,    qty: 80, prixFige: 4.26 },
      { ftId: ft.tiramisu.id, qty: 80, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 8,  tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 6,  tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 5,  tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 4,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location mobilier lounge', montant: 280 },
      { cat: 'Transport', montant: 160 },
    ],
    analyse: {
      caReel: 9200, caPrevu: 8800,
      coutMatiere: 656,
      coutMatierePrevu: 680, coutMatiereReel: 656,
      coutMOD: 522.4,
      coutMODPrevu: 550, coutMODReel: 522.4,
      coutFrais: 440,
      fraisFixes: 124.44,
      tauxPerte: 3.0,
      coutRevientParConvive: 22.78
    }
  });

  // Ev13 — Maison Claire cocktail (May 2024) — Marge 57%
  await createEvent({
    nomClient: 'Maison Claire Cosmétiques — Cocktail Découverte',
    date: '2024-05-16',
    ca: 21500,
    status: 'Termine',
    tempsProduction: 26,
    lignes: [
      { ftId: ft.verrine.id, qty: 220, prixFige: 1.39 },
      { ftId: ft.gambas.id,  qty: 220, prixFige: 2.09 },
      { ftId: ft.tartare.id, qty: 220, prixFige: 1.98 },
      { ftId: ft.magret.id,  qty: 110, prixFige: 5.06 },
      { ftId: ft.tiramisu.id,qty: 220, prixFige: 0.70 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 14, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 12, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 10, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 8,  tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 8,  tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location vaisselle design', montant: 820 },
      { cat: 'Bar premium champagne', montant: 1400 },
      { cat: 'Transport réfrigéré', montant: 360 },
    ],
    analyse: {
      caReel: 21500, caPrevu: 20800,
      coutMatiere: 2316.6,
      coutMatierePrevu: 2380, coutMatiereReel: 2316.6,
      coutMOD: 1024.4,
      coutMODPrevu: 1050, coutMODReel: 1024.4,
      coutFrais: 2580,
      fraisFixes: 248.88,
      tauxPerte: 3.0,
      coutRevientParConvive: 27.14
    }
  });

  // Ev14 — Altius Gala (Jun 2024) — Marge 58% — meilleure performance
  await createEvent({
    nomClient: 'Institut Médical Altius — Dîner de Direction',
    date: '2024-06-12',
    ca: 24000,
    status: 'Termine',
    tempsProduction: 28,
    lignes: [
      { ftId: ft.tartare.id,  qty: 180, prixFige: 1.98 },
      { ftId: ft.asperges.id, qty: 180, prixFige: 1.24 },
      { ftId: ft.risotto.id,  qty: 180, prixFige: 7.97 },
      { ftId: ft.agneau.id,   qty: 180, prixFige: 6.84 },
      { ftId: ft.tiramisu.id, qty: 180, prixFige: 0.70 },
      { ftId: ft.fromages.id, qty: 180, prixFige: 1.38 },
    ],
    temps: [
      { empId: emp['Thomas Mercier'].id,  heures: 16, tauxFige: 29.50 },
      { empId: emp['Marie Leblanc'].id,  heures: 14, tauxFige: 23.80 },
      { empId: emp['Antoine Moreau'].id, heures: 12, tauxFige: 17.20 },
      { empId: emp['Lucie Favre'].id,    heures: 10, tauxFige: 14.80 },
      { empId: emp['Marc Bertrand'].id,  heures: 10, tauxFige: 14.80 },
    ],
    frais: [
      { cat: 'Location Boiserie prestige', montant: 980 },
      { cat: 'Vins grand cru selection', montant: 1600 },
      { cat: 'Transport réfrigéré + personnel', montant: 440 },
      { cat: 'Floriste décoration', montant: 380 },
    ],
    analyse: {
      caReel: 24000, caPrevu: 22000,
      coutMatiere: 3600,
      coutMatierePrevu: 3400, coutMatiereReel: 3600,
      coutMOD: 1292,
      coutMODPrevu: 1300, coutMODReel: 1292,
      coutFrais: 3400,
      fraisFixes: 331.84,
      tauxPerte: 3.0,
      coutRevientParConvive: 41.29
    }
  });

  console.log('Seed complete — 14 evenements created spanning Jan 2023 to Jun 2024');
  console.log('Act 1 (Jan-Jun 2023): 5 events — high variance margins (16%-61%)');
  console.log('Act 2 (Jul-Dec 2023): 4 events — normalization Cost Freeze (44%-55%)');
  console.log('Act 3 (Jan-Jun 2024): 5 events — stabilized margins (52%-58%)');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
