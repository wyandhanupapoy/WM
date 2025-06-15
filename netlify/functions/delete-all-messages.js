// File: netlify/functions/delete-all-messages.js
const admin = require('firebase-admin');
const Pusher = require('pusher');

// Inisialisasi
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
  }
} catch (e) { console.error("Firebase init error", e); }
const db = admin.firestore();
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
});

// Fungsi helper untuk menghapus koleksi secara batch
async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
    if (snapshot.size === 0) {
        return resolve();
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

// Handler utama
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Verifikasi Token dan Peran Admin
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) { return { statusCode: 401, headers, body: 'Unauthorized' }; }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // ✅ INI ADALAH PENGECEKAN ADMIN
    if (decodedToken.admin !== true) {
        return { statusCode: 403, headers, body: 'Forbidden: Admin access required.' };
    }

    // Jalankan penghapusan
    await deleteCollection('messages', 100);

    // Beri tahu semua klien untuk membersihkan layar chat mereka
    await pusher.trigger('chat-channel', 'chat-cleared', { message: 'Chat history has been cleared by an admin.' });

    return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };

  } catch (error) {
    console.error("Error deleting all messages:", error);
    return { statusCode: 500, headers, body: 'Failed to delete messages.' };
  }
};