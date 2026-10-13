const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// Liste des rôles valides pour la validation applicative
const ROLES_VALIDES = ['COMMIS', 'SERVEUR', 'ADMINISTRATIF', 'LIVREUR'];

// 1. OBTENIR TOUS LES EMPLOYÉS (filtre par rôle optionnel)
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;

    const filter = {};
    if (role) {
      const roleUpper = role.toUpperCase();
      if (ROLES_VALIDES.includes(roleUpper)) {
        filter.role = roleUpper;
      } else {
        return res.status(400).json({ 
          error: `Rôle de recherche invalide. Rôles valides : ${ROLES_VALIDES.join(', ')}` 
        });
      }
    }

    const employes = await prisma.employeOuProfil.findMany({
      where: filter,
      orderBy: {
        nomOuType: 'asc'
      }
    });

    return res.json(employes);
  } catch (error) {
    console.error("Erreur lors de la récupération des profils employés :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 2. OBTENIR UN PROFIL D'EMPLOYÉ PAR SON ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const employe = await prisma.employeOuProfil.findUnique({
      where: { id }
    });

    if (!employe) {
      return res.status(404).json({ error: "Profil employé non trouvé." });
    }

    return res.json(employe);
  } catch (error) {
    console.error("Erreur lors de la récupération du profil employé :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 3. CRÉER UN PROFIL D'EMPLOYÉ
router.post('/', async (req, res) => {
  try {
    const { nomOuType, role, coutHoraireCharge } = req.body;

    // Validations minimales
    if (!nomOuType || !role) {
      return res.status(400).json({ error: "Les champs nomOuType et role sont obligatoires." });
    }

    // Validation du rôle
    const roleUpper = role.toUpperCase();
    if (!ROLES_VALIDES.includes(roleUpper)) {
      return res.status(400).json({ 
        error: `Rôle invalide. Rôles autorisés : ${ROLES_VALIDES.join(', ')}` 
      });
    }

    // Validation du coût horaire
    const cout = parseFloat(coutHoraireCharge);
    if (isNaN(cout) || cout < 0) {
      return res.status(400).json({ error: "Le coût horaire chargé doit être un nombre positif ou nul." });
    }

    // Vérifier l'unicité du nom/type
    const existant = await prisma.employeOuProfil.findUnique({
      where: { nomOuType }
    });
    if (existant) {
      return res.status(400).json({ error: "Un employé ou profil avec ce nom existe déjà." });
    }

    const nouvelEmploye = await prisma.employeOuProfil.create({
      data: {
        nomOuType,
        role: roleUpper,
        coutHoraireCharge: cout
      }
    });

    return res.status(201).json(nouvelEmploye);
  } catch (error) {
    console.error("Erreur lors de la création du profil employé :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 4. METTRE À JOUR UN PROFIL D'EMPLOYÉ
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nomOuType, role, coutHoraireCharge } = req.body;

    // Vérifier si le profil existe
    const employe = await prisma.employeOuProfil.findUnique({ where: { id } });
    if (!employe) {
      return res.status(404).json({ error: "Profil employé non trouvé." });
    }

    const dataUpdate = {};
    if (nomOuType) dataUpdate.nomOuType = nomOuType;

    if (role) {
      const roleUpper = role.toUpperCase();
      if (!ROLES_VALIDES.includes(roleUpper)) {
        return res.status(400).json({ error: "Rôle de profil invalide." });
      }
      dataUpdate.role = roleUpper;
    }

    if (coutHoraireCharge !== undefined) {
      const cout = parseFloat(coutHoraireCharge);
      if (isNaN(cout) || cout < 0) {
        return res.status(400).json({ error: "Le coût horaire chargé doit être un nombre positif ou nul." });
      }
      dataUpdate.coutHoraireCharge = cout;
    }

    const employeMisAJour = await prisma.employeOuProfil.update({
      where: { id },
      data: dataUpdate
    });

    return res.json(employeMisAJour);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil employé :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// 5. SUPPRIMER UN PROFIL D'EMPLOYÉ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le profil existe
    const employe = await prisma.employeOuProfil.findUnique({ where: { id } });
    if (!employe) {
      return res.status(404).json({ error: "Profil employé non trouvé." });
    }

    await prisma.employeOuProfil.delete({
      where: { id }
    });

    return res.json({ message: "Profil employé supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du profil employé :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de la suppression." });
  }
});

module.exports = router;
