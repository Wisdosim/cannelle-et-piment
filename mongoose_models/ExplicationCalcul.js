const mongoose = require('mongoose');

const ExplicationCalculSchema = new mongoose.Schema(
  {
    entiteConcernee: {
      type: String,
      required: [true, "L'entité concernée est requise."],
      index: true
    },
    nomIndicateur: {
      type: String,
      required: [true, "Le nom de l'indicateur est requis."]
    },
    formuleLitterale: {
      type: String,
      required: [true, "La formule littérale est requise."]
    },
    variablesUtilisees: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Les variables utilisées sont requises."]
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('ExplicationCalcul', ExplicationCalculSchema);
