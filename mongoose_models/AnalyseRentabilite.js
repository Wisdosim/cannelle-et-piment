const mongoose = require('mongoose');

const AnalyseRentabiliteSchema = new mongoose.Schema(
  {
    evenementDevisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EvenementDevis',
      required: [true, "L'événement devis est requis."],
      unique: true,
      index: true
    },
    totalCoutMatiere: {
      type: Number,
      required: [true, "Le total du coût matière est requis."],
      default: 0.0
    },
    totalMainOeuvreDirecte: {
      type: Number,
      required: [true, "Le total de main d'œuvre directe est requis."],
      default: 0.0
    },
    totalFraisExternes: {
      type: Number,
      required: [true, "Le total des frais externes est requis."],
      default: 0.0
    },
    margeBruteHT: {
      type: Number,
      required: [true, "La marge brute HT est requise."],
      default: 0.0
    },
    quotePartFraisFixes: {
      type: Number,
      default: 0.0
    },
    tauxPerteForfaitaire: {
      type: Number,
      default: 5.0
    },
    coutPerteAlimentaire: {
      type: Number,
      default: 0.0
    },
    margeNetteHT: {
      type: Number,
      default: 0.0
    },
    coutRevientParConvive: {
      type: Number,
      default: 0.0
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('AnalyseRentabilite', AnalyseRentabiliteSchema);
