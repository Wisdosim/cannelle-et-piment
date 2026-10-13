const mongoose = require('mongoose');

const AchatFactureSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: [true, "L'identifiant de l'article est requis."],
      index: true
    },
    prixTotalLigne: {
      type: Number,
      required: [true, "Le prix total de la ligne est requis."],
      min: [0.0, "Le prix total ne peut pas être négatif."]
    },
    quantiteAchetee: {
      type: Number,
      required: [true, "La quantité achetée est requise."],
      min: [0.0001, "La quantité achetée doit être supérieure à 0."]
    },
    uniteAchat: {
      type: String,
      required: [true, "L'unité d'achat est requise (ex: Caisse)."],
      trim: true
    },
    poidsReelUniteBase: {
      type: Number,
      required: [true, "Le poids ou volume réel équivalent en unité de base est requis."],
      min: [0.0001, "Le poids réel doit être supérieur à 0."]
    },
    creeLe: {
      type: Date,
      default: Date.now
    }
  }
);

// ============================================================================
// HOOK POST-SAVE : RÈGLE DU DERNIER PRIX D'ACHAT (LAST PURCHASE PRICE)
// ============================================================================
AchatFactureSchema.post('save', async function (doc, next) {
  try {
    const prixTotal = doc.prixTotalLigne || 0.0;
    const poidsBase = doc.poidsReelUniteBase || 1.0;
    
    // Calcul du coût unitaire de base (arrondi à 2 décimales)
    const prixUnitaireCalculed = Math.round((prixTotal / poidsBase) * 100) / 100;
    
    // Mise à jour automatique de la fiche Article avec le dernier prix calculé
    await mongoose.model('Article').findByIdAndUpdate(
      doc.articleId,
      { prixUnitaireBase: prixUnitaireCalculed },
      { new: true }
    );
    
    console.log(`[Hook AchatFacture] Article mis à jour : prixUnitaireBase = ${prixUnitaireCalculed} €`);
    next();
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article par le hook d'achat :", error);
    next(error);
  }
});

module.exports = mongoose.model('AchatFacture', AchatFactureSchema);
