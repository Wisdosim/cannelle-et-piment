-- ============================================================================
-- SQL SCHEMA - CANNELLE ET PIMENT
-- Compatible: PostgreSQL (v12+) / Modifiable pour MySQL
-- Description: Gestion des achats et des stocks pour un traiteur
-- ============================================================================

-- 1. Énumération des Catégories de produits
CREATE TYPE CategorieEnum AS ENUM (
    'Produits laitiers',
    'Viandes et Volailles',
    'Poissons et Crustacés',
    'Épicerie et Sec',
    'Fruits et Légumes',
    'Boissons',
    'Spiritueux'
);

-- 2. Table des Articles (Fiches Produits)
CREATE TABLE Article (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL UNIQUE,
    categorie CategorieEnum NOT NULL,
    unite_achat VARCHAR(50) NOT NULL, -- ex: 'Caisse', 'Kg', 'Pièce'
    unite_recette VARCHAR(50) NOT NULL, -- ex: 'Gramme', 'Centilitre', 'Pièce'
    facteur_conversion DECIMAL(12, 4) NOT NULL DEFAULT 1.0000, -- Ratio entre achat et recette (ex: 1000 pour Kg -> Gramme)
    unite_base VARCHAR(50) NOT NULL, -- ex: 'Kg', 'L'
    prix_unitaire_base DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Calculé au Kg/L par le dernier achat
    prix_achat_unitaire DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Prix unitaire d'achat HT
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des Stocks (État théorique actuel)
CREATE TABLE Stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL UNIQUE,
    quantite_actuelle DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    date_derniere_mise_a_jour TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    zone_stockage_id UUID,
    
    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_stock_article FOREIGN KEY (article_id) 
        REFERENCES Article(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_zone FOREIGN KEY (zone_stockage_id)
        REFERENCES Zone_Stockage(id) ON DELETE SET NULL
);

-- 4. Table des Inventaires Mensuels (Saisie physique)
CREATE TABLE Inventaire_Mensuel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_inventaire TIMESTAMP WITH TIME ZONE NOT NULL,
    article_id UUID NOT NULL,
    quantite_reelle DECIMAL(12, 4) NOT NULL,
    ecart_stock DECIMAL(12, 4) NOT NULL, -- Calculé : quantite_reelle - stock.quantite_actuelle
    valeur_financiere_stock DECIMAL(12, 2) NOT NULL, -- Calculé : quantite_reelle * article.prix_achat_unitaire
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_inventaire_article FOREIGN KEY (article_id) 
        REFERENCES Article(id) ON DELETE RESTRICT
);

-- ============================================================================
-- INDEXES POUR OPTIMISER LES PERFORMANCES DES REQUÊTES
-- ============================================================================

-- Index sur les catégories pour accélérer les filtrages
CREATE INDEX idx_article_categorie ON Article(categorie);

-- Index sur la clé étrangère de Stock
CREATE INDEX idx_stock_article_id ON Stock(article_id);

-- Index composites pour les rapports d'inventaires mensuels (recherches par date et article)
CREATE INDEX idx_inventaire_date_article ON Inventaire_Mensuel(date_inventaire, article_id);

-- ============================================================================
-- TRIGGERS DE MISE À JOUR AUTOMATIQUE DU TIMESTAMP "mis_a_jour_le"
-- ============================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mis_a_jour_le = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_article_modtime
    BEFORE UPDATE ON Article
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- 5. MAIN D'ŒUVRE ET COMPTABILITÉ ANALYTIQUE
-- ============================================================================

-- Énumération des Rôles
CREATE TYPE RoleEnum AS ENUM (
    'Commis',
    'Serveur',
    'Administratif',
    'Livreur'
);

-- Table des Profils d'Employés / Main d'œuvre
CREATE TABLE Employe_ou_Profil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_ou_type VARCHAR(255) NOT NULL UNIQUE, -- ex: 'Jean Dupont' ou 'Extra Commis'
    role RoleEnum NOT NULL,
    cout_horaire_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Coût horaire chargé pour l'entreprise
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur le rôle pour les tris et regroupements analytiques
CREATE INDEX idx_employe_role ON Employe_ou_Profil(role);

-- Déclencheur pour mettre à jour automatiquement le champ "mis_a_jour_le"
CREATE TRIGGER update_employe_modtime
    BEFORE UPDATE ON Employe_ou_Profil
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- 6. GESTION DES ESPACES DE STOCKAGE ET ACHATS FACTURÉS
-- ============================================================================

-- Table des Zones de Stockage (Chambre froide, Réserve sèche, etc.)
CREATE TABLE Zone_Stockage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Déclencheur de mise à jour pour Zone_Stockage
CREATE TRIGGER update_zone_modtime
    BEFORE UPDATE ON Zone_Stockage
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table des Achats Facturés (Facturation fournisseurs)
CREATE TABLE Achat_Facture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    prix_total_ligne DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantite_achetee DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unite_achat VARCHAR(50) NOT NULL, -- ex: 'Caisse', 'Palette'
    poids_reel_unite_base DECIMAL(12, 4) NOT NULL, -- ex: Le poids ou volume réel équivalent en Kg ou L
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_achat_article FOREIGN KEY (article_id) 
        REFERENCES Article(id) ON DELETE CASCADE
);

-- Fonction de mise à jour du prix unitaire de base de l'article (Dernier prix d'achat)
CREATE OR REPLACE FUNCTION update_article_prix_unitaire_base()
RETURNS TRIGGER AS $$
BEGIN
    -- Met à jour la colonne prix_unitaire_base sur l'article concerné
    UPDATE Article
    SET prix_unitaire_base = ROUND(NEW.prix_total_ligne / NULLIF(NEW.poids_reel_unite_base, 0), 2)
    WHERE id = NEW.article_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur après insertion d'une ligne d'achat pour mettre à jour l'article
CREATE TRIGGER after_achat_insert_update_prix
    AFTER INSERT ON Achat_Facture
    FOR EACH ROW
    EXECUTE FUNCTION update_article_prix_unitaire_base();

-- ============================================================================
-- 7. LOGIQUE DES RECETTES (FICHES TECHNIQUES) ET DEVIS ÉVÉNEMENTIELS
-- ============================================================================

-- Énumération stricte des catégories de plats
CREATE TYPE CategoriePlatEnum AS ENUM (
    'Entree',
    'Plat',
    'Dessert',
    'Cocktail',
    'Buffet'
);

-- Table des Fiches Techniques (Recettes de base)
CREATE TABLE Fiche_Technique (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_recette VARCHAR(255) NOT NULL UNIQUE,
    categorie_plat CategoriePlatEnum NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Déclencheur de mise à jour pour Fiche_Technique
CREATE TRIGGER update_fiche_modtime
    BEFORE UPDATE ON Fiche_Technique
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table de Lignes de Fiche Technique (Ingrédients de la recette)
CREATE TABLE Fiche_Technique_Ligne (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiche_technique_id UUID NOT NULL,
    article_id UUID NOT NULL,
    quantite_necessaire_unite_base DECIMAL(12, 4) NOT NULL, -- ex: Poids requis en Kg (0.150 pour 150g)

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_fiche_ligne_recipe FOREIGN KEY (fiche_technique_id) 
        REFERENCES Fiche_Technique(id) ON DELETE CASCADE,
    CONSTRAINT fk_fiche_ligne_article FOREIGN KEY (article_id) 
        REFERENCES Article(id) ON DELETE CASCADE
);

-- Index pour accélérer le calcul analytique d'une recette
CREATE INDEX idx_fiche_ligne_recipe ON Fiche_Technique_Ligne(fiche_technique_id);

-- Table des Événements Devis (Réservations traiteur de clients)
CREATE TABLE Evenement_Devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_client VARCHAR(255) NOT NULL,
    date_evenement TIMESTAMP WITH TIME ZONE NOT NULL,
    prix_vente_ht DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Prix de vente facturé au client HT
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Déclencheur de mise à jour pour Evenement_Devis
CREATE TRIGGER update_devis_modtime
    BEFORE UPDATE ON Evenement_Devis
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table des Recettes affectées à un Devis (Lignes de devis)
CREATE TABLE Devis_Ligne_Recette (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_devis_id UUID NOT NULL,
    fiche_technique_id UUID NOT NULL,
    nombre_portions INT NOT NULL DEFAULT 1, -- ex: Nombre d'invités consommant ce plat

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_devis_ligne_event FOREIGN KEY (evenement_devis_id) 
        REFERENCES Evenement_Devis(id) ON DELETE CASCADE,
    CONSTRAINT fk_devis_ligne_recipe FOREIGN KEY (fiche_technique_id) 
        REFERENCES Fiche_Technique(id) ON DELETE CASCADE
);

-- Index pour accélérer le chiffrage global d'un événement
CREATE INDEX idx_devis_ligne_event ON Devis_Ligne_Recette(evenement_devis_id);

-- Table du Temps de Travail Direct par Événement (Main d'œuvre affectée)
CREATE TABLE Temps_Travail_Evenement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_devis_id UUID NOT NULL,
    employe_id UUID NOT NULL,
    heures_effectuees_cuisine DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    cout_total_main_oeuvre DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Calculé au niveau applicatif (heures * coût horaire)
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_temps_devis FOREIGN KEY (evenement_devis_id) 
        REFERENCES Evenement_Devis(id) ON DELETE CASCADE,
    CONSTRAINT fk_temps_employe FOREIGN KEY (employe_id) 
        REFERENCES Employe_ou_Profil(id) ON DELETE CASCADE
);

-- Index pour accélérer les regroupements analytiques de main d'œuvre
CREATE INDEX idx_temps_devis ON Temps_Travail_Evenement(evenement_devis_id);

-- Déclencheur de mise à jour de timestamp pour Temps_Travail_Evenement
CREATE TRIGGER update_temps_modtime
    BEFORE UPDATE ON Temps_Travail_Evenement
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table des Frais Externes Directs (Location vaisselle, livraison, etc.)
CREATE TABLE Frais_Externe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_devis_id UUID NOT NULL,
    categorie VARCHAR(255) NOT NULL, -- ex: 'Location vaisselle'
    montant_ht DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_frais_devis FOREIGN KEY (evenement_devis_id) 
        REFERENCES Evenement_Devis(id) ON DELETE CASCADE
);

-- Index pour accélérer la valorisation des frais externes
CREATE INDEX idx_frais_devis ON Frais_Externe(evenement_devis_id);

-- Déclencheur de mise à jour de timestamp pour Frais_Externe
CREATE TRIGGER update_frais_modtime
    BEFORE UPDATE ON Frais_Externe
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table d'Analyse de Rentabilité (Consolidation analytique pour graphiques)
CREATE TABLE Analyse_Rentabilite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_devis_id UUID NOT NULL UNIQUE,
    total_cout_matiere DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_main_oeuvre_directe DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_frais_externes DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    marge_brute_ht DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quote_part_frais_fixes DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Frais fixes imputés
    taux_perte_forfaitaire DECIMAL(5, 2) NOT NULL DEFAULT 5.00,  -- Taux de perte forfaitaire en %
    cout_perte_alimentaire DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Pertes alimentaires estimées
    marge_nette_ht DECIMAL(10, 2) NOT NULL DEFAULT 0.00,         -- Marge nette HT
    cout_revient_par_convive DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Coût de revient moyen par convive
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Clés Étrangères et Contraintes
    CONSTRAINT fk_rentabilite_devis FOREIGN KEY (evenement_devis_id) 
        REFERENCES Evenement_Devis(id) ON DELETE CASCADE
);

-- Index pour accélérer la récupération de la rentabilité d'un devis
CREATE INDEX idx_rentabilite_devis ON Analyse_Rentabilite(evenement_devis_id);

-- Déclencheur de mise à jour de timestamp pour Analyse_Rentabilite
CREATE TRIGGER update_rentabilite_modtime
    BEFORE UPDATE ON Analyse_Rentabilite
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Table d'Explication des Calculs (Traçabilité et audit analytique)
CREATE TABLE Explication_Calcul (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entite_concernee VARCHAR(255) NOT NULL,
    nom_indicateur VARCHAR(255) NOT NULL,
    formule_litterale TEXT NOT NULL,
    variables_utilisees JSONB NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accélérer la recherche par entité
CREATE INDEX idx_explication_entite ON Explication_Calcul(entite_concernee);

-- Déclencheur de mise à jour de timestamp pour Explication_Calcul
CREATE TRIGGER update_explication_modtime
    BEFORE UPDATE ON Explication_Calcul
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();





