const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// FONCTION UTILITAIRE POUR ÉCHAPPER LES CARACTÈRES CSV
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes(';')) {
    return `"${str}"`;
  }
  return str;
}


// ============================================================
// EXPORT CSV — EvenementDevis + AnalyseRentabilite (filtré par date)
// DOIT ÊTRE DÉCLARÉ AVANT LA ROUTE PARAMÉTRÉE /csv/:table
// GET /api/export/csv/evenements?dateDebut=2026-01-01&dateFin=2026-12-31
// ============================================================
router.get('/csv/evenements', async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const whereClause = {};
    if (dateDebut || dateFin) {
      whereClause.dateEvenement = {};
      if (dateDebut) {
        const d = new Date(dateDebut);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'dateDebut invalide. Format attendu : YYYY-MM-DD.' });
        d.setHours(0, 0, 0, 0);
        whereClause.dateEvenement.gte = d;
      }
      if (dateFin) {
        const d = new Date(dateFin);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'dateFin invalide. Format attendu : YYYY-MM-DD.' });
        d.setHours(23, 59, 59, 999);
        whereClause.dateEvenement.lte = d;
      }
    }
    const devis = await prisma.evenementDevis.findMany({
      where: whereClause,
      include: {
        analyseRentabilite: true,
        devisLots: {
          include: {
            lignesProduit: { include: { ficheTechnique: true } },
            prestations: {
              include: {
                lignesProduit: { include: { ficheTechnique: true } }
              }
            }
          }
        },
        tempsTravail: { include: { employe: true } },
        fraisExternes: true
      },
      orderBy: { dateEvenement: 'asc' }
    });

    const headers = [
      'ID Devis','Nom Client','Date Événement','Statut',
      'CA Saisi Prévu (€)','CA Saisi Réel (€)',
      'Coût Matières Prévu (€)','Coût Matières Réel (€)',
      "Coût Main d'Œuvre Prévu (€)","Coût Main d'Œuvre Réel (€)",
      'Coût Frais Externes (€)','Quote-Part Frais Fixes (€)',
      'Taux de Perte (%)','Coût Pertes Alimentaires (€)',
      'Marge Brute HT (€)','Marge Nette HT (€)','Taux de Marge Nette (%)',
      'Coût de Revient / Convive (€)','Nombre de Recettes','Nombre de Collaborateurs'
    ];
    let csvContent = headers.map(escapeCSV).join(';') + '\n';
    let totalCaPrevu = 0, totalCaReel = 0, totalMargeBrute = 0, totalMargeNette = 0;

    devis.forEach(d => {
      // Aplatir les lignes de produit du devis issues de l'arborescence Lots -> Prestations
      const devisLignes = [];
      if (d.devisLots) {
        d.devisLots.forEach(lot => {
          if (lot.lignesProduit) {
            lot.lignesProduit.forEach(lp => {
              devisLignes.push({
                ...lp,
                nombrePortions: lp.quantitePrevue
              });
            });
          }
          if (lot.prestations) {
            lot.prestations.forEach(prest => {
              if (prest.lignesProduit) {
                prest.lignesProduit.forEach(lp => {
                  devisLignes.push({
                    ...lp,
                    nombrePortions: lp.quantitePrevue
                  });
                });
              }
            });
          }
        });
      }

      const ar = d.analyseRentabilite || {};
      const caPrevu = d.chiffreAffairesSaisiPrevu || 0;
      const caReel  = d.chiffreAffairesSaisiReel  || 0;
      const margeBrute = ar.margeBruteHT || 0;
      const margeNette = ar.margeNetteHT || 0;
      const tauxMargeNette = caReel > 0 ? ((margeNette / caReel) * 100).toFixed(2) : '—';
      const tauxPerte = ar.tauxPerteSaisi != null ? ar.tauxPerteSaisi : (ar.tauxPerteForfaitaire || 5.0);
      totalCaPrevu   += caPrevu;
      totalCaReel    += caReel;
      totalMargeBrute += margeBrute;
      totalMargeNette += margeNette;
      const row = [
        d.id, d.nomClient, d.dateEvenement.toLocaleDateString('fr-FR'), d.status,
        caPrevu.toFixed(2), caReel.toFixed(2),
        (ar.coutMatierePrevu    || 0).toFixed(2), (ar.coutMatiereReel    || 0).toFixed(2),
        (ar.coutMainOeuvrePrevu || 0).toFixed(2), (ar.coutMainOeuvreReel || 0).toFixed(2),
        (ar.totalFraisExternes  || 0).toFixed(2), (ar.quotePartFraisFixes || 0).toFixed(2),
        tauxPerte,
        (ar.coutPerteAlimentaire || 0).toFixed(2),
        margeBrute.toFixed(2), margeNette.toFixed(2), tauxMargeNette,
        (ar.coutRevientParConvive || 0).toFixed(2),
        devisLignes.length,
        d.tempsTravail  ? d.tempsTravail.length   : 0
      ];
      csvContent += row.map(escapeCSV).join(';') + '\n';
    });

    const totalTauxMarge = totalCaReel > 0 ? ((totalMargeNette / totalCaReel) * 100).toFixed(2) : '—';
    const totalRow = [
      'TOTAL', `${devis.length} événement(s)`, '', '',
      totalCaPrevu.toFixed(2), totalCaReel.toFixed(2),
      '', '', '', '', '', '', '', '',
      totalMargeBrute.toFixed(2), totalMargeNette.toFixed(2), totalTauxMarge, '', '', ''
    ];
    csvContent += '\n' + totalRow.map(escapeCSV).join(';') + '\n';

    const dateRange = (dateDebut && dateFin) ? `_${dateDebut}_au_${dateFin}` : `_complet_${new Date().toISOString().slice(0,10)}`;
    const filename  = `export_evenements${dateRange}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error("Erreur export CSV événements :", err);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'exportation CSV." });
  }
});

// ============================================================
// EXPORT EXCEL — EvenementDevis + AnalyseRentabilite (filtré par date)
// DOIT ÊTRE DÉCLARÉ AVANT LA ROUTE PARAMÉTRÉE /excel/:table
// GET /api/export/excel/evenements?dateDebut=2026-01-01&dateFin=2026-12-31
// ============================================================
router.get('/excel/evenements', async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const whereClause = {};
    if (dateDebut || dateFin) {
      whereClause.dateEvenement = {};
      if (dateDebut) {
        const d = new Date(dateDebut);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'dateDebut invalide. Format attendu : YYYY-MM-DD.' });
        d.setHours(0, 0, 0, 0);
        whereClause.dateEvenement.gte = d;
      }
      if (dateFin) {
        const d = new Date(dateFin);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'dateFin invalide. Format attendu : YYYY-MM-DD.' });
        d.setHours(23, 59, 59, 999);
        whereClause.dateEvenement.lte = d;
      }
    }
    const devis = await prisma.evenementDevis.findMany({
      where: whereClause,
      include: {
        analyseRentabilite: true,
        devisLots: {
          include: {
            lignesProduit: { include: { ficheTechnique: true } },
            prestations: {
              include: {
                lignesProduit: { include: { ficheTechnique: true } }
              }
            }
          }
        },
        tempsTravail: { include: { employe: true } },
        fraisExternes: true
      },
      orderBy: { dateEvenement: 'asc' }
    });
    const periodLabel = (dateDebut && dateFin)
      ? `Période : ${new Date(dateDebut).toLocaleDateString('fr-FR')} → ${new Date(dateFin).toLocaleDateString('fr-FR')}`
      : `Export complet — généré le ${new Date().toLocaleDateString('fr-FR')}`;

    let totalCaPrevu = 0, totalCaReel = 0, totalMargeBrute = 0, totalMargeNette = 0;
    let eventRows = '';
    devis.forEach((d, idx) => {
      // Aplatir les lignes de produit du devis issues de l'arborescence Lots -> Prestations
      const devisLignes = [];
      if (d.devisLots) {
        d.devisLots.forEach(lot => {
          if (lot.lignesProduit) {
            lot.lignesProduit.forEach(lp => {
              devisLignes.push({
                ...lp,
                nombrePortions: lp.quantitePrevue
              });
            });
          }
          if (lot.prestations) {
            lot.prestations.forEach(prest => {
              if (prest.lignesProduit) {
                prest.lignesProduit.forEach(lp => {
                  devisLignes.push({
                    ...lp,
                    nombrePortions: lp.quantitePrevue
                  });
                });
              }
            });
          }
        });
      }

      const ar = d.analyseRentabilite || {};
      const caPrevu = d.chiffreAffairesSaisiPrevu || 0;
      const caReel  = d.chiffreAffairesSaisiReel  || 0;
      const margeBrute = ar.margeBruteHT || 0;
      const margeNette = ar.margeNetteHT || 0;
      const tauxMarge  = caReel > 0 ? `${((margeNette / caReel) * 100).toFixed(1)} %` : '—';
      const tauxPerte  = ar.tauxPerteSaisi != null ? ar.tauxPerteSaisi : (ar.tauxPerteForfaitaire || 5.0);
      totalCaPrevu    += caPrevu;
      totalCaReel     += caReel;
      totalMargeBrute += margeBrute;
      totalMargeNette += margeNette;
      const statusBg = d.status === 'Termine' ? '#E8F5E9' : d.status === 'Valide' ? '#E3F2FD' : '#FFF8E1';
      const margeBg   = margeNette >= 0 ? '#E8F5E9' : '#FFEBEE';
      const margeCol  = margeNette >= 0 ? '#1B5E20' : '#B71C1C';
      const stripeBg  = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      const recettes  = devisLignes.length > 0
        ? devisLignes.map(l => `${l.ficheTechnique ? l.ficheTechnique.nomRecette : '?'} ×${l.nombrePortions}`).join(', ') : '—';
      const personnel = d.tempsTravail && d.tempsTravail.length > 0
        ? d.tempsTravail.map(t => `${t.employe ? t.employe.nomOuType : '?'} (${t.totalHeuresPrepareesEtJourJ}h)`).join(', ') : '—';
      eventRows += `
        <tr style="background:${stripeBg}">
          <td style="padding:8px 10px;font-size:11px;color:#666">${d.dateEvenement.toLocaleDateString('fr-FR')}</td>
          <td style="padding:8px 10px;font-weight:700;font-size:13px">${d.nomClient}</td>
          <td style="padding:4px 8px;text-align:center"><span style="background:${statusBg};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">${d.status}</span></td>
          <td class="number">${caPrevu.toFixed(2)} €</td>
          <td class="number" style="font-weight:700">${caReel.toFixed(2)} €</td>
          <td class="number">${(ar.coutMatierePrevu    || 0).toFixed(2)} €</td>
          <td class="number">${(ar.coutMatiereReel     || 0).toFixed(2)} €</td>
          <td class="number">${(ar.coutMainOeuvrePrevu || 0).toFixed(2)} €</td>
          <td class="number">${(ar.coutMainOeuvreReel  || 0).toFixed(2)} €</td>
          <td class="number">${(ar.totalFraisExternes  || 0).toFixed(2)} €</td>
          <td class="number">${(ar.quotePartFraisFixes || 0).toFixed(2)} €</td>
          <td class="number">${tauxPerte} %</td>
          <td class="number">${(ar.coutPerteAlimentaire || 0).toFixed(2)} €</td>
          <td class="number">${margeBrute.toFixed(2)} €</td>
          <td class="number" style="background:${margeBg};color:${margeCol};font-weight:800">${margeNette.toFixed(2)} €</td>
          <td class="number" style="background:${margeBg};color:${margeCol};font-weight:700">${tauxMarge}</td>
          <td class="number">${(ar.coutRevientParConvive || 0).toFixed(2)} €</td>
          <td style="padding:8px 10px;font-size:10px;color:#555">${recettes}</td>
          <td style="padding:8px 10px;font-size:10px;color:#555">${personnel}</td>
        </tr>`;
    });

    const totalTauxMarge = totalCaReel > 0 ? `${((totalMargeNette / totalCaReel) * 100).toFixed(1)} %` : '—';
    const totalMargeBg  = totalMargeNette >= 0 ? '#C8E6C9' : '#FFCDD2';
    const totalMargeCol = totalMargeNette >= 0 ? '#1B5E20' : '#B71C1C';
    const totalRow = `
      <tr style="border-top:3px solid #2E7D32;font-weight:800;font-size:13px">
        <td colspan="3" style="padding:10px;text-align:center;background:#2E7D32;color:white;font-weight:800">📊 TOTAUX — ${devis.length} événement(s)</td>
        <td class="number" style="background:#E8F5E9;font-weight:800">${totalCaPrevu.toFixed(2)} €</td>
        <td class="number" style="background:#E8F5E9;font-weight:800">${totalCaReel.toFixed(2)} €</td>
        <td class="number">—</td><td class="number">—</td>
        <td class="number">—</td><td class="number">—</td>
        <td class="number">—</td><td class="number">—</td>
        <td class="number">—</td><td class="number">—</td>
        <td class="number" style="background:#E8F5E9;font-weight:800">${totalMargeBrute.toFixed(2)} €</td>
        <td class="number" style="background:${totalMargeBg};color:${totalMargeCol};font-weight:900;font-size:15px">${totalMargeNette.toFixed(2)} €</td>
        <td class="number" style="background:${totalMargeBg};color:${totalMargeCol};font-weight:900">${totalTauxMarge}</td>
        <td class="number">—</td>
        <td colspan="2"></td>
      </tr>`;

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
  <style>
    body{font-family:'Segoe UI',sans-serif;margin:20px}
    h1{color:#1B5E20;font-size:20px;margin-bottom:4px}
    h2{color:#2E7D32;font-size:16px;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #A5D6A7;padding-bottom:6px}
    .subtitle{color:#555;font-size:12px;margin-bottom:20px}
    .badge{display:inline-block;background:#2E7D32;color:white;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:14px}
    table{border-collapse:collapse;width:100%}
    th{background:linear-gradient(135deg,#1B5E20,#2E7D32);color:#FFF;font-weight:700;border:1px solid #A5D6A7;padding:9px 10px;font-size:11px;text-align:center;white-space:nowrap}
    td{border:1px solid #E0E0E0;padding:6px 10px;font-size:12px;vertical-align:middle}
    .number{text-align:right;mso-number-format:"0\\.00"}
    .footer{margin-top:20px;font-size:10px;color:#999}
  </style>
</head>
<body>
  <h1>🌿 Cannelle &amp; Piment — Rapport de Rentabilité Analytique</h1>
  <p class="subtitle">${periodLabel}</p>
  <div class="badge">📊 Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
  <h2>📋 Événements &amp; Analyse de Rentabilité</h2>
  <table>
    <thead><tr>
      <th>Date Événement</th><th>Nom Client / Événement</th><th>Statut</th>
      <th>CA Prévu (€)</th><th>CA Réel (€)</th>
      <th>Matière Prév. (€)</th><th>Matière Réel (€)</th>
      <th>MOD Prév. (€)</th><th>MOD Réel (€)</th>
      <th>Frais Ext. (€)</th><th>Frais Fixes (€)</th><th>Tx Perte (%)</th><th>Pertes Alim. (€)</th>
      <th>Marge Brute (€)</th><th>Marge Nette (€)</th><th>Tx Marge Nette</th><th>Coût / Convive (€)</th>
      <th>Recettes &amp; Portions</th><th>Personnel Affecté</th>
    </tr></thead>
    <tbody>
      ${eventRows || '<tr><td colspan="19" style="text-align:center;color:#999;padding:20px">Aucun événement trouvé dans cette période.</td></tr>'}
      ${totalRow}
    </tbody>
  </table>
  <p class="footer">Export depuis Cannelle &amp; Piment Moteur Analytique — SQLite — Données brutes sans arrondi comptable.</p>
</body></html>`;

    const dateRange = (dateDebut && dateFin) ? `_${dateDebut}_au_${dateFin}` : `_complet_${new Date().toISOString().slice(0,10)}`;
    const filename  = `rapport_evenements${dateRange}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(html);
  } catch (err) {
    console.error("Erreur export Excel événements :", err);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'exportation Excel." });
  }
});

// 1. EXPORT AU FORMAT CSV (Achats, Devis, Stocks)
router.get('/csv/:table', async (req, res) => {
  try {
    const { table } = req.params;
    let csvContent = '';
    let filename = `export_${table}_${new Date().toISOString().slice(0,10)}.csv`;

    if (table === 'stocks') {
      return res.status(400).json({ error: "L'export des stocks a été désactivé car la gestion des stocks est déléguée à un logiciel externe." });
    } else if (table === 'achats') {
      const achats = await prisma.achatFacture.findMany({
        include: {
          article: true
        }
      });

      // En-tête
      csvContent += 'ID Achat;ID Article;Nom Article;Categorie;Quantite Achetee;Unite Achat;Prix Total HT;Poids Reel (Unite Base);Date Facturation\n';

      // Lignes
      achats.forEach(a => {
        csvContent += `${escapeCSV(a.id)};` +
                      `${escapeCSV(a.articleId)};` +
                      `${escapeCSV(a.article.nom)};` +
                      `${escapeCSV(a.article.categorie)};` +
                      `${a.quantiteAchetee};` +
                      `${escapeCSV(a.uniteAchat)};` +
                      `${a.prixTotalLigne};` +
                      `${a.poidsReelUniteBase};` +
                      `${a.creeLe.toISOString()}\n`;
      });

    } else if (table === 'devis') {
      const devis = await prisma.evenementDevis.findMany({
        include: {
          analyseRentabilite: true
        }
      });

      // En-tête
      csvContent += 'ID Devis;Client;Date Evenement;Chiffre Affaires HT;Cout Matiere HT;Main d\'Oeuvre HT;Frais Externes HT;Frais Fixes Allocations;Pertes Alimentaires;Marge Brute HT;Marge Nette HT;Coût Revient Convive\n';

      // Lignes
      devis.forEach(d => {
        const ar = d.analyseRentabilite || {};
        csvContent += `${escapeCSV(d.id)};` +
                      `${escapeCSV(d.nomClient)};` +
                      `${d.dateEvenement.toISOString()};` +
                      `${d.chiffreAffairesSaisi || 0.0};` +
                      `${ar.totalCoutMatiere || 0.0};` +
                      `${ar.totalMainOeuvreDirecte || 0.0};` +
                      `${ar.totalFraisExternes || 0.0};` +
                      `${ar.quotePartFraisFixes || 0.0};` +
                      `${ar.coutPerteAlimentaire || 0.0};` +
                      `${ar.margeBruteHT || 0.0};` +
                      `${ar.margeNetteHT || 0.0};` +
                      `${ar.coutRevientParConvive || 0.0}\n`;
      });

    } else {
      return res.status(400).json({ error: "Table d'export invalide. Choisissez entre : stocks, achats, devis." });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(csvContent);

  } catch (error) {
    console.error("Erreur lors de l'export CSV :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'exportation." });
  }
});

// 2. EXPORT AU FORMAT EXCEL (Achats, Devis, Stocks) VIA HTML NATIVE EXCEL HEADERS
router.get('/excel/:table', async (req, res) => {
  try {
    const { table } = req.params;
    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          th { background-color: #2E7D32; color: #FFFFFF; font-weight: bold; border: 1px solid #A5D6A7; padding: 8px; }
          td { border: 1px solid #E0E0E0; padding: 6px 12px; }
          .number { text-align: right; mso-number-format: "0\\.00"; }
          .title { font-size: 16px; font-weight: bold; color: #1B5E20; padding-bottom: 12px; }
        </style>
      </head>
      <body>
    `;
    let filename = `export_${table}_${new Date().toISOString().slice(0,10)}.xls`;

    if (table === 'stocks') {
      return res.status(400).json({ error: "L'export des stocks a été désactivé car la gestion des stocks est déléguée à un logiciel externe." });
    } else if (table === 'achats') {
      const achats = await prisma.achatFacture.findMany({
        include: {
          article: true
        }
      });

      excelHtml += `
        <div class="title">Historique des Factures d'Achats - Cannelle & Piment 🌿</div>
        <table>
          <tr>
            <th>ID Facture</th>
            <th>ID Article</th>
            <th>Nom Article</th>
            <th>Catégorie</th>
            <th>Quantité Achetée</th>
            <th>Unité d'Achat</th>
            <th>Prix Total HT</th>
            <th>Poids Réel Unité Base</th>
            <th>Date Facturation</th>
          </tr>
      `;

      achats.forEach(a => {
        excelHtml += `
          <tr>
            <td>${a.id}</td>
            <td>${a.articleId}</td>
            <td><b>${a.article.nom}</b></td>
            <td>${a.article.categorie}</td>
            <td class="number">${a.quantiteAchetee}</td>
            <td>${a.uniteAchat}</td>
            <td class="number">${a.prixTotalLigne} €</td>
            <td class="number">${a.poidsReelUniteBase}</td>
            <td>${a.creeLe.toLocaleDateString()}</td>
          </tr>
        `;
      });

      excelHtml += '</table>';

    } else if (table === 'devis') {
      const devis = await prisma.evenementDevis.findMany({
        include: {
          analyseRentabilite: true
        }
      });

      excelHtml += `
        <div class="title">Rentabilité Analytique des Événements & Devis - Cannelle & Piment 📊</div>
        <table>
          <tr>
            <th>ID Devis</th>
            <th>Client</th>
            <th>Date Événement</th>
            <th>Chiffre d'Affaires HT</th>
            <th>Coût Matières HT</th>
            <th>Main d'œuvre HT</th>
            <th>Frais Externes HT</th>
            <th>Frais Fixes Allocations</th>
            <th>Pertes Alimentaires</th>
            <th>Marge Brute HT</th>
            <th>Marge Nette HT</th>
            <th>Coût de Revient / Convive</th>
          </tr>
      `;

      devis.forEach(d => {
        const ar = d.analyseRentabilite || {};
        excelHtml += `
          <tr>
            <td>${d.id}</td>
            <td><b>${d.nomClient}</b></td>
            <td>${d.dateEvenement.toLocaleDateString()}</td>
            <td class="number">${d.chiffreAffairesSaisi || 0.0} €</td>
            <td class="number">${ar.totalCoutMatiere || 0.0} €</td>
            <td class="number">${ar.totalMainOeuvreDirecte || 0.0} €</td>
            <td class="number">${ar.totalFraisExternes || 0.0} €</td>
            <td class="number">${ar.quotePartFraisFixes || 0.0} €</td>
            <td class="number">${ar.coutPerteAlimentaire || 0.0} €</td>
            <td class="number">${ar.margeBruteHT || 0.0} €</td>
            <td class="number" style="background-color: ${(ar.margeNetteHT || 0.0) >= 0 ? '#E8F5E9' : '#FFEBEE'}">${ar.margeNetteHT || 0.0} €</td>
            <td class="number">${ar.coutRevientParConvive || 0.0} €</td>
          </tr>
        `;
      });

      excelHtml += '</table>';

    } else {
      return res.status(400).json({ error: "Table d'export Excel invalide. Choisissez entre : stocks, achats, devis." });
    }

    excelHtml += '</body></html>';

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(excelHtml);

  } catch (error) {
    console.error("Erreur lors de l'export Excel :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'exportation." });
  }
});


module.exports = router;
