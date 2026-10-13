const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

const CATEGORIES_PLAT = ['ENTREE', 'PLAT', 'DESSERT', 'COCKTAIL', 'BUFFET'];

// 1. LIRE TOUTES LES FICHES TECHNIQUES (avec coût analytique des ingrédients calculé en temps réel)
router.get('/', async (req, res) => {
  try {
    const fiches = await prisma.ficheTechnique.findMany({
      include: {
        lignes: {
          include: {
            article: true
          }
        }
      },
      orderBy: { nomRecette: 'asc' }
    });

    // Calcul analytique dynamique du coût des matières premières de chaque recette
    const fichesAvecCouts = fiches.map(f => {
      let coutIngredients = 0.0;
      f.lignes.forEach(l => {
        coutIngredients += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
      });
      return {
        ...f,
        coutIngredients: Math.round(coutIngredients * 100) / 100
      };
    });

    return res.json(fichesAvecCouts);
  } catch (error) {
    console.error("Erreur lors de la récupération des fiches techniques :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. LIRE UNE FICHE TECHNIQUE PAR SON ID (avec coût analytique détaillé)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      include: {
        lignes: {
          include: {
            article: true
          }
        }
      }
    });

    if (!fiche) {
      return res.status(404).json({ error: "Fiche technique non trouvée." });
    }

    let coutIngredients = 0.0;
    fiche.lignes.forEach(l => {
      coutIngredients += (l.quantiteNecessaireUniteBase || 0) * (l.article.prixUnitaireBase || 0);
    });

    return res.json({
      ...fiche,
      coutIngredients: Math.round(coutIngredients * 100) / 100
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la fiche technique :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 3. CRÉER UNE FICHE TECHNIQUE ET SES LIGNES D'INGRÉDIENTS
router.post('/', async (req, res) => {
  try {
    const { nomRecette, categoriePlat, lignes } = req.body;

    // Validation
    if (!nomRecette || !categoriePlat) {
      return res.status(400).json({ error: "Les champs nomRecette et categoriePlat sont obligatoires." });
    }

    const catUpper = categoriePlat.toUpperCase();
    if (!CATEGORIES_PLAT.includes(catUpper)) {
      return res.status(400).json({ 
        error: `Catégorie de plat invalide. Catégories valides : ${CATEGORIES_PLAT.join(', ')}` 
      });
    }

    const existant = await prisma.ficheTechnique.findUnique({ where: { nomRecette } });
    if (existant) {
      return res.status(400).json({ error: "Une fiche technique avec ce nom de recette existe déjà." });
    }

    // Transaction Prisma : création de la fiche technique ET de toutes ses lignes d'ingrédients
    const nouvelleFiche = await prisma.$transaction(async (tx) => {
      const ft = await tx.ficheTechnique.create({
        data: {
          nomRecette,
          categoriePlat: catUpper
        }
      });

      if (lignes && Array.isArray(lignes)) {
        for (const l of lignes) {
          if (!l.articleId || l.quantiteNecessaireUniteBase === undefined) {
            throw new Error("Chaque ligne de recette doit contenir un articleId et une quantiteNecessaireUniteBase.");
          }
          await tx.ficheTechniqueLigne.create({
            data: {
              ficheTechniqueId: ft.id,
              articleId: l.articleId,
              quantiteNecessaireUniteBase: parseFloat(l.quantiteNecessaireUniteBase)
            }
          });
        }
      }

      return ft;
    });

    const complete = await prisma.ficheTechnique.findUnique({
      where: { id: nouvelleFiche.id },
      include: {
        lignes: {
          include: {
            article: true
          }
        }
      }
    });

    return res.status(201).json(complete);
  } catch (error) {
    console.error("Erreur lors de la création de la fiche technique :", error);
    return res.status(400).json({ error: error.message || "Une erreur interne est survenue." });
  }
});

// 4. METTRE À JOUR UNE FICHE TECHNIQUE ET SES LIGNES D'INGRÉDIENTS
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nomRecette, categoriePlat, lignes } = req.body;

    const fiche = await prisma.ficheTechnique.findUnique({ where: { id } });
    if (!fiche) {
      return res.status(404).json({ error: "Fiche technique non trouvée." });
    }

    const catUpper = categoriePlat ? categoriePlat.toUpperCase() : undefined;
    if (catUpper && !CATEGORIES_PLAT.includes(catUpper)) {
      return res.status(400).json({ 
        error: `Catégorie de plat invalide. Catégories valides : ${CATEGORIES_PLAT.join(', ')}` 
      });
    }

    // Transaction Prisma : suppression des anciennes lignes et création des nouvelles
    const ficheMiseAJour = await prisma.$transaction(async (tx) => {
      // Mettre à jour l'en-tête
      const ft = await tx.ficheTechnique.update({
        where: { id },
        data: {
          nomRecette,
          categoriePlat: catUpper
        }
      });

      if (lignes && Array.isArray(lignes)) {
        // Supprimer toutes les anciennes lignes
        await tx.ficheTechniqueLigne.deleteMany({
          where: { ficheTechniqueId: id }
        });

        // Insérer les nouvelles lignes
        for (const l of lignes) {
          if (!l.articleId || l.quantiteNecessaireUniteBase === undefined) {
            throw new Error("Chaque ligne de recette doit contenir un articleId et une quantiteNecessaireUniteBase.");
          }
          await tx.ficheTechniqueLigne.create({
            data: {
              ficheTechniqueId: id,
              articleId: l.articleId,
              quantiteNecessaireUniteBase: parseFloat(l.quantiteNecessaireUniteBase)
            }
          });
        }
      }

      return ft;
    });

    const complete = await prisma.ficheTechnique.findUnique({
      where: { id: ficheMiseAJour.id },
      include: {
        lignes: {
          include: {
            article: true
          }
        }
      }
    });

    return res.json(complete);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la fiche technique :", error);
    return res.status(400).json({ error: error.message || "Une erreur interne est survenue." });
  }
});

// 5. SUPPRIMER UNE FICHE TECHNIQUE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const fiche = await prisma.ficheTechnique.findUnique({ where: { id } });
    if (!fiche) {
      return res.status(404).json({ error: "Fiche technique non trouvée." });
    }

    await prisma.ficheTechnique.delete({ where: { id } });

    return res.json({ message: "Fiche technique et toutes ses lignes associées supprimées avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de la fiche technique :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

module.exports = router;
