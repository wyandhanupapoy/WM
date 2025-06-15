// File: set-admin-claim.js
const admin = require('firebase-admin');

// PENTING: Arahkan ini ke file kunci service account JSON Anda
const serviceAccount = require('./serviceAccountKey.json'); // GANTI JIKA NAMA FILE BERBEDA

// GANTI DENGAN EMAIL YANG INGIN ANDA JADIKAN ADMIN
const adminEmail = "email-admin-anda@gmail.com"; 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`Berhasil! Pengguna ${adminEmail} telah dijadikan admin.`);
    console.log("Silakan logout dan login kembali di aplikasi untuk melihat perubahannya.");

  } catch (error) {
    console.error("Gagal menjadikan admin:", error.message);
  }
}

setAdmin();