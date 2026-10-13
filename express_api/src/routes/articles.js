const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. OBTENIR TOUS LES ARTICLES (avec filtres optionnels)
router.get('/', async (req, res) => {
  try {
    const { categorie } = req.query;
    
    const filter = {};
    if (categorie) {
      filter.categorie = categorie.toUpperCase();
    }

    const articles = await prisma.article.findMany({
      where: filter,
      orderBy: {
        nom: 'asc'
      }
    });
    
    return res.json(articles);
  } catch (error) {
    console.error("Erreur lors de la récupération des articles :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. OBTENIR UN ARTICLE SPÉCIFIQUE
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const article = await prisma.article.findUnique({
      where: { id }
    });

    if (!article) {
      return res.status(404).json({ error: "Article non trouvé." });
    }

    return res.json(article);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 3. CRÉER UN ARTICLE
router.post('/', async (req, res) => {
  try {
    const { nom, categorie, uniteAchat, uniteRecette, facteurConversion, prixAchatUnitaire, uniteBase, prixUnitaireBase, familleRSE, classificationRSE } = req.body;

    // Validations minimales
    if (!nom || !categorie || !uniteAchat || !uniteRecette || !uniteBase) {
      return res.status(400).json({ error: "Les champs nom, categorie, uniteAchat, uniteRecette et uniteBase sont obligatoires." });
    }

    // Validation de la catégorie par rapport à l'enum Prisma
    const categoriesValides = [
      'PRODUITS_LAITIERS', 'VIANDES_ET_VOLAILLES', 'POISSONS_ET_CRUSTACES', 
      'EPICERIE_ET_SEC', 'FRUITS_ET_LEGUMES', 'BOISSONS', 'SPIRITUEUX'
    ];
    
    const catUpper = categorie.toUpperCase().replace(/ /g, '_');
    if (!categoriesValides.includes(catUpper)) {
      return res.status(400).json({ 
        error: `Catégorie invalide. Valeurs autorisées : ${categoriesValides.join(', ')}` 
      });
    }

    // Vérifier si le nom existe déjà
    const articleExistant = await prisma.article.findUnique({ where: { nom } });
    if (articleExistant) {
      return res.status(400).json({ error: "Un article avec ce nom existe déjà." });
    }

    // Création de l'article
    const nouvelArticle = await prisma.article.create({
      data: {
        nom,
        categorie: catUpper,
        uniteAchat,
        uniteRecette,
        facteurConversion: parseFloat(facteurConversion) || 1.0,
        prixAchatUnitaire: parseFloat(prixAchatUnitaire) || 0.0,
        uniteBase,
        prixUnitaireBase: parseFloat(prixUnitaireBase) || 0.0,
        familleRSE: familleRSE || null,
        classificationRSE: classificationRSE || null
      }
    });

    return res.status(201).json(nouvelArticle);
  } catch (error) {
    console.error("Erreur lors de la création de l'article :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 4. METTRE À JOUR UN ARTICLE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, categorie, uniteAchat, uniteRecette, facteurConversion, prixAchatUnitaire, uniteBase, prixUnitaireBase, familleRSE, classificationRSE } = req.body;

    // Vérifier si l'article existe
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: "Article non trouvé." });
    }

    const dataUpdate = {};
    if (nom) dataUpdate.nom = nom;
    if (uniteAchat) dataUpdate.uniteAchat = uniteAchat;
    if (uniteRecette) dataUpdate.uniteRecette = uniteRecette;
    if (uniteBase) dataUpdate.uniteBase = uniteBase;
    
    if (facteurConversion !== undefined) {
      dataUpdate.facteurConversion = parseFloat(facteurConversion);
    }
    
    if (prixAchatUnitaire !== undefined) {
      dataUpdate.prixAchatUnitaire = parseFloat(prixAchatUnitaire);
    }

    if (prixUnitaireBase !== undefined) {
      dataUpdate.prixUnitaireBase = parseFloat(prixUnitaireBase);
    }

    if (familleRSE !== undefined) {
      dataUpdate.familleRSE = familleRSE || null;
    }

    if (classificationRSE !== undefined) {
      dataUpdate.classificationRSE = classificationRSE || null;
    }

    if (categorie) {
      const catUpper = categorie.toUpperCase().replace(/ /g, '_');
      const categoriesValides = [
        'PRODUITS_LAITIERS', 'VIANDES_ET_VOLAILLES', 'POISSONS_ET_CRUSTACES', 
        'EPICERIE_ET_SEC', 'FRUITS_ET_LEGUMES', 'BOISSONS', 'SPIRITUEUX'
      ];
      if (!categoriesValides.includes(catUpper)) {
        return res.status(400).json({ error: "Catégorie invalide." });
      }
      dataUpdate.categorie = catUpper;
    }

    const articleMisAJour = await prisma.article.update({
      where: { id },
      data: dataUpdate
    });

    return res.json(articleMisAJour);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 5. SUPPRIMER UN ARTICLE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'article existe
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: "Article non trouvé." });
    }

    // Suppression de l'article (le stock associé sera supprimé en cascade)
    await prisma.article.delete({
      where: { id }
    });

    return res.json({ message: "Article supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'article :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de la suppression." });
  }
});

module.exports = router;
