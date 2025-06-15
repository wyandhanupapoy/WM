// File: netlify/functions/utils/initialize.js
// Deskripsi: Modul untuk inisialisasi layanan agar tidak duplikat.

const admin = require('firebase-admin');
const Pusher = require('pusher');

function initializeFirebaseAdmin() {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
            });
        } catch (e) {
            console.error("KRITIS: Gagal inisialisasi Firebase Admin SDK.", e);
            // Dalam lingkungan produksi, ini harus menyebabkan alarm
        }
    }
    return admin;
}

let pusherInstance = null;

function initializePusher() {
    if (!pusherInstance) {
        pusherInstance = new Pusher({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.PUSHER_KEY,
            secret: process.env.PUSHER_SECRET,
            cluster: process.env.PUSHER_CLUSTER,
            useTLS: true
        });
    }
    return pusherInstance;
}

module.exports = { initializeFirebaseAdmin, initializePusher };