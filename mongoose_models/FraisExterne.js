const mongoose = require('mongoose');

const FraisExterneSchema = new mongoose.Schema(
  {
    evenementDevisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EvenementDevis',
      required: [true, "L'événement devis est requis."]
    },
    categorie: {
      type: String,
      required: [true, "La catégorie du frais externe est requise (ex: Location vaisselle)."],
      trim: true
    },
    montantHT: {
      type: Number,
      required: [true, "Le montant HT est requis."],
      min: [0.0, "Le montant HT doit être positif ou nul."]
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('FraisExterne', FraisExterneSchema);
