const mongoose = require('mongoose');
const RoleEnum = require('./Role');

const EmployeOuProfilSchema = new mongoose.Schema(
  {
    nomOuType: {
      type: String,
      required: [true, "Le nom de l'employé ou type de profil est requis."],
      unique: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      required: [true, "Le rôle du profil est requis."],
      enum: {
        values: RoleEnum,
        message: "{VALUE} n'est pas un rôle valide."
      }
    },
    coutHoraireCharge: {
      type: Number,
      required: [true, "Le coût horaire chargé est requis."],
      default: 0.0,
      min: [0.0, "Le coût horaire chargé ne peut pas être négatif."]
    }
  },
  {
    timestamps: { createdAt: 'creeLe', updatedAt: 'misAJourLe' }
  }
);

module.exports = mongoose.model('EmployeOuProfil', EmployeOuProfilSchema);
