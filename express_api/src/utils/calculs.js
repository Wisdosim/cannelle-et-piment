/**
 * Fonctions utilitaires de calcul pour la gestion des stocks de Cannelle & Piment.
 */

/**
 * Calcule l'écart de stock entre la quantité réelle constatée physiquement
 * et la quantité théorique en base de données.
 * 
 * @param {number} quantiteReelle - Quantité observée lors de l'inventaire
 * @param {number} quantiteTheorique - Quantité théorique enregistrée en stock
 * @returns {number} L'écart (positif si excédent, négatif si perte)
 */
function calculerEcart(quantiteReelle, quantiteTheorique) {
  const qReelle = parseFloat(quantiteReelle) || 0.0;
  const qTheorique = parseFloat(quantiteTheorique) || 0.0;
  
  // Arrondi à 4 décimales pour éviter les erreurs de calcul en virgule flottante
  return Math.round((qReelle - qTheorique) * 10000) / 10000;
}

/**
 * Calcule la valeur financière du stock actuel d'un article.
 * 
 * @param {number} quantiteReelle - Quantité réelle physique constatée
 * @param {number} prixAchatUnitaire - Prix d'achat unitaire de l'article
 * @returns {number} La valeur financière totale HT (arrondie à 2 décimales)
 */
function calculerValeurFinanciere(quantiteReelle, prixAchatUnitaire) {
  const qReelle = parseFloat(quantiteReelle) || 0.0;
  const prix = parseFloat(prixAchatUnitaire) || 0.0;
  
  // Arrondi à 2 décimales pour les montants monétaires
  return Math.round((qReelle * prix) * 100) / 100;
}

module.exports = {
  calculerEcart,
  calculerValeurFinanciere
};
