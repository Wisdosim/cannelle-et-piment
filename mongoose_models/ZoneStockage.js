const mongoose = require('mongoose');

const ZoneStockageSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de la zone de stockage est requis (ex: Chambre froide)."],
      unique: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('ZoneStockage', ZoneStockageSchema);
