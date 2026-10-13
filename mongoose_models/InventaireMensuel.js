const mongoose = require('mongoose');

const InventaireMensuelSchema = new mongoose.Schema(
  {
    dateInventaire: {
      type: Date,
      required: [true, "La date de réalisation de l'inventaire est requise."],
      index: true
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: [true, "L'identifiant de l'article inventorié est requis."],
      index: true
    },
    quantiteReelle: {
      type: Number,
      required: [true, "La quantité réelle physique observée est requise."],
      min: [0, "La quantité réelle ne peut pas être négative."]
    },
    ecartStock: {
      type: Number,
      required: [true, "L'écart de stock (théorique vs réel) doit être spécifié."]
    },
    valeurFinanciereStock: {
      type: Number,
      required: [true, "La valeur financière du stock réel doit être spécifiée."],
      min: [0, "La valeur financière ne peut pas être négative."]
    },
    creeLe: {
      type: Date,
      default: Date.now
    }
  }
);

module.exports = mongoose.model('InventaireMensuel', InventaireMensuelSchema);
