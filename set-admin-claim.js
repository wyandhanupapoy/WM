// File: set-admin-claim.js
// Deskripsi: Skrip Node.js untuk memberikan custom claim 'admin: true' kepada pengguna Firebase Authentication.

const admin = require('firebase-admin');
const path = require('path');

// --- KONFIGURASI ---
// GANTI DENGAN EMAIL YANG INGIN ANDA JADIKAN ADMIN
const ADMIN_EMAIL_TO_SET = "email-admin-anda@gmail.com"; 

// GANTI DENGAN NAMA FILE KUNCI SERVICE ACCOUNT JSON ANDA
const SERVICE_ACCOUNT_KEY_FILENAME = 'serviceAccountKey.json'; 

// --- Validasi Konfigurasi Awal ---
if (ADMIN_EMAIL_TO_SET === "email-admin-anda@gmail.com") {
    console.error("\n[KESALAHAN] Harap ganti nilai variabel 'ADMIN_EMAIL_TO_SET' dengan alamat email target di dalam file ini.");
    process.exit(1);
}

const serviceAccountPath = path.join(__dirname, SERVICE_ACCOUNT_KEY_FILENAME);
let serviceAccount;
try {
    serviceAccount = require(serviceAccountPath);
} catch (error) {
    console.error(`\n[KESALAHAN] File service account '${SERVICE_ACCOUNT_KEY_FILENAME}' tidak ditemukan.`);
    console.error("Pastikan file tersebut berada di direktori yang sama dengan skrip ini atau perbarui variabel 'SERVICE_ACCOUNT_KEY_FILENAME'.");
    process.exit(1);
}

// --- Inisialisasi Firebase Admin SDK ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Fungsi untuk mencari pengguna berdasarkan email dan menetapkan custom claim.
 */
async function setAdminClaim() {
  console.log(`Mencoba menjadikan pengguna '${ADMIN_EMAIL_TO_SET}' sebagai admin...`);

  try {
    // 1. Dapatkan data pengguna dari Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL_TO_SET);
    const uid = userRecord.uid;

    // 2. Dapatkan custom claims yang sudah ada (jika ada)
    const currentClaims = userRecord.customClaims || {};

    // 3. Tetapkan custom claim { admin: true }
    // Ini akan menimpa claim yang ada, jadi kita gabungkan jika perlu mempertahankan claim lain
    await admin.auth().setCustomUserClaims(uid, { ...currentClaims, admin: true });

    // 4. Konfirmasi
    console.log("\x1b[32m%s\x1b[0m", `\n[BERHASIL] Pengguna '${ADMIN_EMAIL_TO_SET}' (UID: ${uid}) telah berhasil dijadikan admin.`);
    console.log("PENTING: Pengguna harus logout dan login kembali di aplikasi untuk melihat perubahan hak akses.");

  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "\n[GAGAL] Terjadi kesalahan saat proses menjadikan admin:");
    if (error.code === 'auth/user-not-found') {
        console.error(`Error: Pengguna dengan email '${ADMIN_EMAIL_TO_SET}' tidak ditemukan di Firebase Authentication.`);
    } else {
        console.error(`Error Code: ${error.code}`);
        console.error(`Pesan Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Jalankan fungsi
setAdminClaim();