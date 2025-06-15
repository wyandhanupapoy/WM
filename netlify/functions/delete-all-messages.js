// File: netlify/functions/delete-all-messages.js
// ALGORITMA YANG TELAH DIPERBAIKI DAN LEBIH ROBUST

const { initializeFirebaseAdmin, initializePusher } = require('./utils/initialize');

const admin = initializeFirebaseAdmin();
const pusher = initializePusher();
const db = admin.firestore();

/**
 * Fungsi rekursif yang lebih andal untuk menghapus dokumen dalam batch.
 * @param {FirebaseFirestore.Query} query - Query Firestore untuk dokumen yang akan dihapus.
 * @param {Function} resolve - Fungsi resolve dari Promise.
 * @param {Function} reject - Fungsi reject dari Promise.
 * @param {number} totalDeleted - Akumulator untuk jumlah dokumen yang dihapus.
 */
async function deleteQueryBatch(query, resolve, reject, totalDeleted = 0) {
    try {
        const snapshot = await query.get();

        // Kondisi berhenti (base case): tidak ada lagi dokumen yang ditemukan.
        if (snapshot.size === 0) {
            console.log(`Proses selesai. Total dokumen yang dihapus: ${totalDeleted}`);
            return resolve();
        }

        // Buat batch untuk menghapus dokumen yang ditemukan.
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        const numDeleted = snapshot.size;
        await batch.commit();

        // Lanjutkan ke batch berikutnya secara rekursif.
        // Ini lebih aman daripada loop `while(true)` di beberapa lingkungan.
        process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject, totalDeleted + numDeleted);
        });

    } catch (error) {
        console.error("Error selama proses penghapusan batch:", error);
        reject(error);
    }
}

// Handler utama
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (decodedToken.admin !== true) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Admin access required.' }) };
        }

        console.log(`Admin '${decodedToken.email}' memulai penghapusan semua pesan...`);
        
        const collectionRef = db.collection('messages');
        const query = collectionRef.orderBy('__name__').limit(200); // Ukuran batch

        // Membungkus proses rekursif dalam Promise
        await new Promise((resolve, reject) => {
            deleteQueryBatch(query, resolve, reject).catch(reject);
        });

        console.log("Semua pesan berhasil dihapus dari Firestore.");

        await pusher.trigger('chat-channel', 'chat-cleared', {
            message: 'Chat history has been cleared by an admin.'
        });

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };

    } catch (error) {
        console.error("SERVER ERROR [delete-all-messages]:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete all messages.' }) };
    }
};