// File: netlify/functions/delete-all-messages.js
const { initializeFirebaseAdmin, initializePusher } = require('./utils/initialize');
const admin = initializeFirebaseAdmin();
const pusher = initializePusher();
const db = admin.firestore();

// Fungsi helper untuk menghapus koleksi secara batch
async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);

    while (true) {
        const snapshot = await query.get();

        // --- TAMBAHKAN BARIS DEBUG INI ---
        console.log(`Snapshot ditemukan dengan ukuran: ${snapshot.size}`);
        // ------------------------------------

        
        if (snapshot.size === 0) {
            return; // Selesai
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Tidak perlu process.nextTick di lingkungan serverless modern
        // Loop akan melanjutkan setelah commit selesai
    }
}

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

        // Pengecekan krusial: pastikan pengguna adalah admin
        if (decodedToken.admin !== true) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Admin access required.' }) };
        }

        console.log(`Admin '${decodedToken.email}' memulai penghapusan semua pesan...`);
        await deleteCollection('messages', 200); // Ukuran batch bisa disesuaikan
        console.log("Semua pesan berhasil dihapus dari Firestore.");

        // Beri tahu semua klien untuk membersihkan UI mereka
        await pusher.trigger('chat-channel', 'chat-cleared', {
            message: 'Chat history has been cleared by an admin.'
        });

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };

    } catch (error) {
        console.error("SERVER ERROR [delete-all-messages]:", error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Invalid or expired token.' }) };
        }
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete all messages.' }) };
    }
};
