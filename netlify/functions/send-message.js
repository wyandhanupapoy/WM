// File: netlify/functions/send-message.js

const Pusher = require('pusher');
const admin = require('firebase-admin');

// ... (Inisialisasi Firebase & Pusher tetap sama)
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
    });
  }
} catch (e) {
  console.error("KRITIS: Gagal inisialisasi Firebase Admin SDK. Periksa FIREBASE_CREDENTIALS.", e);
}

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const db = admin.firestore();

exports.handler = async (event) => {
  // ... (Header CORS dan verifikasi token tetap sama)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: 'Unauthorized: Missing or invalid token' };
  }
  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifikasi token:", error);
    return { statusCode: 403, headers, body: 'Forbidden: Invalid token' };
  }
  
  const userEmail = decodedToken.email;

  // --- PERBAIKAN DIMULAI DI SINI ---
  try {
    // Ambil 'message' dan 'imageUrl' dari body request
    const { message, imageUrl } = JSON.parse(event.body);

    // Buat objek chatMessage yang lengkap
    const chatMessage = {
      username: userEmail,
      message: message || '', // Pastikan message ada, meski kosong
      imageUrl: imageUrl || null, // Tambahkan imageUrl
      timestamp: new Date()
    };
    
    // Simpan dokumen yang sudah lengkap ke Firestore
    const docRef = await db.collection('messages').add(chatMessage);

    // Kirim data yang sudah lengkap (termasuk ID baru) ke Pusher
    await pusher.trigger('chat-channel', 'new-message', {
        id: docRef.id, // Sertakan ID dokumen baru
        ...chatMessage
    });

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ status: 'success', id: docRef.id })
    };
  } catch (error) {
    console.error("SERVER ERROR saat proses pesan:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: 'Failed to process message on server.' })
    };
  }
};