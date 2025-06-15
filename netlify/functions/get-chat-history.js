// File: netlify/functions/get-chat-history.js
// VERSI FINAL YANG SUDAH DIPERBAIKI

const admin = require('firebase-admin');

// Inisialisasi Firebase
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
  }
} catch (e) { console.error("Firebase init error", e); }

const db = admin.firestore();

exports.handler = async (event) => {
  // Pengaturan Header CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS' // Hanya izinkan GET untuk history
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Verifikasi Token Otentikasi Pengguna
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Invalid token' }) };
  }

  // Ambil data dari Firestore
  try {
    const snapshot = await db.collection('messages').orderBy('timestamp', 'asc').limitToLast(100).get();
    
    // ✅ PERBAIKAN: Memformat data dengan benar sebelum dikirim
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username,
        message: data.message || '',
        imageUrl: data.imageUrl || null,
        // Konversi Firestore Timestamp ke format ISO string yang standar
        timestamp: data.timestamp.toDate().toISOString(), 
        isEdited: data.isEdited || false
      };
    });

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(messages)
    };
  } catch (error) {
    console.error("SERVER ERROR fetching history:", error);
    return { 
      statusCode: 500, 
      headers: headers, 
      body: JSON.stringify({ error: 'Failed to fetch chat history.' }) 
    };
  }
};
