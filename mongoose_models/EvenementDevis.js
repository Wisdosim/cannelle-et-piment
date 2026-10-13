const mongoose = require('mongoose');

// Schéma imbriqué pour les recettes affectées à un devis d'événement (Lignes de devis)
const DevisLigneRecetteSchema = new mongoose.Schema({
  ficheTechniqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FicheTechnique',
    required: [true, "La fiche technique de recette est requise."]
  },
  nombrePortions: {
    type: Number,
    required: [true, "Le nombre de portions est requis."],
    default: 1,
    min: [1, "Le nombre de portions doit être au moins de 1."]
  },
  prixUnitaireFige: {
    type: Number,
    default: 0.0,
    required: [true, "Le prix unitaire figé est requis."]
  }
});

// Schéma principal de l'événement devis
const EvenementDevisSchema = new mongoose.Schema(
  {
    nomClient: {
      type: String,
      required: [true, "Le nom du client est requis."],
      trim: true
    },
    dateEvenement: {
      type: Date,
      required: [true, "La date de l'événement est requise."]
    },
    chiffreAffairesSaisi: {
      type: Number,
      default: 0.0,
      min: [0.0, "Le CA saisi doit être positif ou nul."]
    },
    chiffreAffairesSaisiPrevu: {
      type: Number,
      default: 0.0,
      min: [0.0, "Le CA prévu doit être positif ou nul."]
    },
    chiffreAffairesSaisiReel: {
      type: Number,
      default: 0.0,
      min: [0.0, "Le CA réel doit être positif ou nul."]
    },
    status: {
      type: String,
      default: 'Brouillon',
      enum: ['Brouillon', 'Envoye', 'Valide_Acompte', 'Termine'],
      required: [true, "Le statut du devis est requis."]
    },
    devisLignes: [DevisLigneRecetteSchema]
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('EvenementDevis', EvenementDevisSchema);
