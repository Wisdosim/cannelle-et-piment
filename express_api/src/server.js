/**
 * CANNELLE ET PIMENT — Serveur Showroom Zero-Config (Vercel Ready)
 * Moteur analytique de controle de gestion pour traiteur evenementiel
 * Mode Showroom Portfolio : Base de donnees simulee en memoire / zero dependance DB
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

let helmet, rateLimit;
try { helmet = require('helmet'); } catch (e) { helmet = null; }
try { rateLimit = require('express-rate-limit'); } catch (e) { rateLimit = null; }

const app = express();
const PORT = process.env.PORT || 3000;

// Chargement des donnees mockees initiales
const mockData = require('./mockData.json');

// Memory store pour mutations de session si requetes directes API
let inMemoryStore = {
  articles: JSON.parse(JSON.stringify(mockData.articles || [])),
  recettes: JSON.parse(JSON.stringify(mockData.recettes || [])),
  devis: JSON.parse(JSON.stringify(mockData.devis || [])),
  employes: [
    { id: 'emp_1', nomOuType: 'Chef Executif', role: 'CHEF', coutHoraireCharge: 32.50 },
    { id: 'emp_2', nomOuType: 'Second de Cuisine', role: 'SECOND', coutHoraireCharge: 24.00 },
    { id: 'emp_3', nomOuType: 'Commis de Cuisine', role: 'COMMIS', coutHoraireCharge: 17.50 },
    { id: 'emp_4', nomOuType: "Maitre d'Hotel", role: 'RESPONSABLE_SALLE', coutHoraireCharge: 22.00 },
    { id: 'emp_5', nomOuType: 'Serveur / Extra', role: 'SERVEUR', coutHoraireCharge: 15.00 }
  ],
  config: {
    quotePartChargesTraiteurPourcentage: 80.0,
    tauxPerteForfaitaireDefaut: 3.0
  },
  parametres: {
    loyerAnnuel: 18000,
    electriciteAnnuelle: 4200,
    assurancesAnnuelles: 2800,
    masseSalarialeIndirecte: 42000,
    autresChargesAnnuelles: 6000,
    joursOuvertureAn: 220,
    heuresParJour: 8
  }
};

// ============================================================================
// MIDDLEWARES
// ============================================================================
if (helmet) {
  app.use(helmet({ contentSecurityPolicy: false }));
}

app.use(cors());
app.use(express.json());

// Fichiers statiques
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

if (rateLimit) {
  app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a moment.' }
  }));
}

// Page d'accueil officielle : Landing Page produit integree
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/showcase', (req, res) => {
  res.sendFile(path.join(publicPath, 'showcase.html'));
});

// ============================================================================
// API ROUTES (ZERO-DB MOCK ENGINE)
// ============================================================================

// --- ARTICLES / MERCURIALE ---
app.get('/api/articles', (req, res) => {
  res.json(inMemoryStore.articles);
});

app.get('/api/articles/:id', (req, res) => {
  const item = inMemoryStore.articles.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Article non trouve.' });
  res.json(item);
});

app.post('/api/articles', (req, res) => {
  const item = { id: 'art_' + Date.now(), ...req.body };
  inMemoryStore.articles.unshift(item);
  res.status(201).json(item);
});

app.put('/api/articles/:id', (req, res) => {
  const idx = inMemoryStore.articles.findIndex(a => a.id === req.params.id);
  if (idx !== -1) {
    inMemoryStore.articles[idx] = { ...inMemoryStore.articles[idx], ...req.body };
    return res.json(inMemoryStore.articles[idx]);
  }
  res.status(404).json({ error: 'Article non trouve.' });
});

app.delete('/api/articles/:id', (req, res) => {
  inMemoryStore.articles = inMemoryStore.articles.filter(a => a.id !== req.params.id);
  res.json({ success: true, message: 'Article supprime.' });
});

// --- RECETTES / FICHES TECHNIQUES ---
app.get('/api/recettes', (req, res) => {
  res.json(inMemoryStore.recettes);
});

app.get('/api/recettes/:id', (req, res) => {
  const item = inMemoryStore.recettes.find(r => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Recette non trouvee.' });
  res.json(item);
});

app.post('/api/recettes', (req, res) => {
  const item = { id: 'ft_' + Date.now(), ...req.body };
  inMemoryStore.recettes.unshift(item);
  res.status(201).json(item);
});

app.put('/api/recettes/:id', (req, res) => {
  const idx = inMemoryStore.recettes.findIndex(r => r.id === req.params.id);
  if (idx !== -1) {
    inMemoryStore.recettes[idx] = { ...inMemoryStore.recettes[idx], ...req.body };
    return res.json(inMemoryStore.recettes[idx]);
  }
  res.status(404).json({ error: 'Recette non trouvee.' });
});

app.delete('/api/recettes/:id', (req, res) => {
  inMemoryStore.recettes = inMemoryStore.recettes.filter(r => r.id !== req.params.id);
  res.json({ success: true, message: 'Recette supprimee.' });
});

// --- DEVIS & EVENEMENTS ---
app.get('/api/devis', (req, res) => {
  res.json(inMemoryStore.devis);
});

app.get('/api/devis-simple', (req, res) => {
  res.json(inMemoryStore.devis);
});

app.post('/api/devis-simple', (req, res) => {
  const newDevis = {
    id: 'dev_' + Date.now(),
    nomClient: req.body.nomClient || 'Nouveau Client',
    dateEvenement: req.body.dateEvenement || new Date().toISOString(),
    chiffreAffairesSaisi: req.body.chiffreAffairesSaisi || 5000,
    status: 'Brouillon',
    ...req.body
  };
  inMemoryStore.devis.unshift(newDevis);
  res.status(201).json(newDevis);
});

// --- RENTABILITE & ANALYTICS ---
app.get('/api/rentabilite', (req, res) => {
  const syntheses = inMemoryStore.devis.map(d => ({
    id: d.id,
    nomClient: d.nomClient,
    dateEvenement: d.dateEvenement,
    ca: d.chiffreAffairesSaisi || 0,
    margeBrute: (d.chiffreAffairesSaisi || 0) - ((d.analyses && d.analyses[0] && d.analyses[0].totalCoutMatiere) || (d.chiffreAffairesSaisi || 0) * 0.28),
    margeBrutePct: 72.0,
    status: d.status || 'Termine'
  }));
  res.json(syntheses);
});

// --- EMPLOYES, CONFIG, PARAMETRES ---
app.get('/api/employes', (req, res) => res.json(inMemoryStore.employes));
app.get('/api/config', (req, res) => res.json(inMemoryStore.config));
app.get('/api/parametres', (req, res) => res.json(inMemoryStore.parametres));

// --- HEALTH & STATUS ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'zero-config showroom', ts: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({
    app: 'Cannelle et Piment — Moteur Analytique B2B',
    version: '2.0.0',
    mode: 'Showroom Portfolio (Zero-DB)',
    status: 'online',
    stack: ['Node.js', 'Express.js', 'Local State', 'Vercel Ready'],
    ts: new Date().toISOString()
  });
});

// ============================================================================
// 404 & ERROR HANDLING
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trouve.' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// ============================================================================
// STARTUP
// ============================================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cannelle et Piment (Zero-Config Showroom) listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
