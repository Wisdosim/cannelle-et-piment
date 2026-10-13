const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: [true, "L'identifiant de l'article est requis."],
      unique: true,
      index: true
    },
    quantiteActuelle: {
      type: Number,
      required: true,
      default: 0.0
    },
    dateDerniereMiseAJour: {
      type: Date,
      default: Date.now
    },
    zoneStockageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZoneStockage',
      default: null,
      index: true
    }
  }
);

// Middleware de pré-enregistrement pour mettre à jour automatiquement la date de mise à jour
StockSchema.pre('save', function (next) {
  this.dateDerniereMiseAJour = new Date();
  next();
});

module.exports = mongoose.model('Stock', StockSchema);
