const mongoose = require('mongoose');
const CategorieEnum = require('./Categorie');

const ArticleSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de l'article est requis."],
      unique: true,
      trim: true,
      index: true
    },
    categorie: {
      type: String,
      required: [true, "La catégorie de l'article est requise."],
      enum: {
        values: CategorieEnum,
        message: "{VALUE} n'est pas une catégorie valide."
      }
    },
    uniteAchat: {
      type: String,
      required: [true, "L'unité d'achat est requise."],
      trim: true
    },
    uniteRecette: {
      type: String,
      required: [true, "L'unité de recette est requise."],
      trim: true
    },
    facteurConversion: {
      type: Number,
      required: [true, "Le facteur de conversion est requis."],
      default: 1.0,
      min: [0.0001, "Le facteur de conversion doit être supérieur à 0."]
    },
    prixAchatUnitaire: {
      type: Number,
      required: [true, "Le prix d'achat unitaire est requis."],
      default: 0.0,
      min: [0.0, "Le prix d'achat ne peut pas être négatif."]
    },
    uniteBase: {
      type: String,
      required: [true, "L'unité de base est requise (ex: Kg, L)."],
      trim: true
    },
    prixUnitaireBase: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0.0, "Le prix unitaire de base ne peut pas être négatif."]
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('Article', ArticleSchema);
