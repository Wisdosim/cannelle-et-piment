const mongoose = require('mongoose');

const TempsTravailEvenementSchema = new mongoose.Schema(
  {
    evenementDevisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EvenementDevis',
      required: [true, "L'événement devis est requis."]
    },
    employeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeOuProfil',
      required: [true, "L'employé ou profil est requis."]
    },
    heuresEffectueesCuisine: {
      type: Number,
      required: [true, "Le nombre d'heures effectuées en cuisine est requis."],
      min: [0.01, "Les heures effectuées doivent être supérieures à 0."]
    },
    prixUnitaireFige: {
      type: Number,
      default: 0.0,
      required: [true, "Le taux horaire figé est requis."]
    },
    coutTotalMainOeuvre: {
      type: Number,
      required: [true, "Le coût total de main d'œuvre est requis."],
      default: 0.0
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('TempsTravailEvenement', TempsTravailEvenementSchema);
