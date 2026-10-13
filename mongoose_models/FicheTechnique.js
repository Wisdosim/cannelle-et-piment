const mongoose = require('mongoose');
const CategoriePlat = require('./CategoriePlat');

// Schéma imbriqué pour les lignes de la fiche technique (Ingrédients requis)
const FicheTechniqueLigneSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: [true, "L'identifiant de l'article est requis."]
  },
  quantiteNecessaireUniteBase: {
    type: Number,
    required: [true, "La quantité requise en unité de base est requise (ex: Kg, L)."],
    min: [0.0001, "La quantité requise doit être supérieure à 0."]
  }
});

// Schéma principal de la fiche technique
const FicheTechniqueSchema = new mongoose.Schema(
  {
    nomRecette: {
      type: String,
      required: [true, "Le nom de la recette est requis."],
      unique: true,
      trim: true,
      index: true
    },
    categoriePlat: {
      type: String,
      required: [true, "La catégorie du plat est requise."],
      enum: {
        values: CategoriePlat,
        message: "{VALUE} n'est pas une catégorie de plat valide."
      }
    },
    lignes: [FicheTechniqueLigneSchema]
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('FicheTechnique', FicheTechniqueSchema);
