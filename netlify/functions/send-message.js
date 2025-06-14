const Pusher = require('pusher');
const admin = require('firebase-admin');

// Inisialisasi Firebase (pastikan hanya sekali)
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
    });
  }
} catch (e) {
  console.error("Firebase admin initialization error", e);
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
  // Header untuk izin CORS
  const headers = {
    'Access-Control-Allow-Origin': '*', // Izinkan semua untuk kemudahan, bisa diperketat nanti
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { username, message } = JSON.parse(event.body);
    const chatMessage = {
      username: username,
      message: message,
      timestamp: new Date()
    };

    // 1. Simpan pesan ke Firestore
    await db.collection('messages').add(chatMessage);
    
    // 2. Memicu Pusher
    await pusher.trigger('chat-channel', 'new-message', chatMessage);

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ status: 'success' })
    };
  } catch (error) {
    console.error("SERVER ERROR:", error); // Log error yang detail
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};