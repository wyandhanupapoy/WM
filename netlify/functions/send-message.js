const Pusher = require('pusher');
const admin = require('firebase-admin');

// Inisialisasi Firebase (dengan penanganan error)
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
    });
  }
} catch (e) {
  console.error("KRITIS: Gagal inisialisasi Firebase Admin SDK. Periksa FIREBASE_CREDENTIALS.", e);
}

// Inisialisasi Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const db = admin.firestore();

exports.handler = async (event) => {
  // Header untuk izin CORS, ini penting untuk semua respons
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Menangani 'preflight' request dari browser
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  // Jika bukan POST, tolak.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // --- Verifikasi Token Otentikasi Pengguna ---
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
  
  // Jika token valid, kita dapatkan email pengguna
  const userEmail = decodedToken.email;

  // --- Proses Inti: Simpan dan Kirim Pesan ---
  try {
    const { message } = JSON.parse(event.body);
    const chatMessage = {
      username: userEmail, // Gunakan email dari token yang aman
      message: message,
      timestamp: new Date()
    };

    // 1. Simpan pesan ke Firestore
    await db.collection('messages').add(chatMessage);
    
    // 2. Memicu Pusher untuk notifikasi real-time
    await pusher.trigger('chat-channel', 'new-message', chatMessage);

    // Kirim respons sukses
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ status: 'success' })
    };
  } catch (error) {
    // Jika terjadi error di bagian ini, log dan kirim respons 500
    console.error("SERVER ERROR saat proses pesan:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: 'Failed to process message on server.' })
    };
  }
};