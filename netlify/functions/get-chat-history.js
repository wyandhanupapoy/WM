const admin = require('firebase-admin');

// Inisialisasi
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
  }
} catch (e) { console.error("Firebase init error", e); }

const db = admin.firestore();

exports.handler = async (event) => {
  // Header untuk izin CORS (dengan perbaikan)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 'Authorization' DITAMBAHKAN DI SINI
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Verifikasi Token Otentikasi
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { statusCode: 403, body: 'Forbidden: Invalid token' };
  }

  // Ambil data dari Firestore
  try {
    const snapshot = await db.collection('messages').orderBy('timestamp').limit(50).get();
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(messages)
    };
  } catch (error) {
    return { statusCode: 500, headers: headers, body: error.toString() };
  }
};