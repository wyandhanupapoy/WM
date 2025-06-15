// File: netlify/functions/send-message.js
// VERSI FINAL YANG SUDAH BENAR

const Pusher = require('pusher');
const admin = require('firebase-admin');

try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
    });
  }
} catch (e) {
  console.error("KRITIS: Gagal inisialisasi Firebase Admin SDK", e);
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
    return { statusCode: 401, headers, body: 'Unauthorized' };
  }
  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { statusCode: 403, headers, body: 'Forbidden' };
  }
  
  const userEmail = decodedToken.email;

  try {
    // ✅ MENGAMBIL 'message' DAN 'imageUrl'
    const { message, imageUrl } = JSON.parse(event.body);

    const chatMessage = {
      username: userEmail,
      message: message || '',
      imageUrl: imageUrl || null, // ✅ MENYERTAKAN imageUrl
      timestamp: new Date()
    };
    
    const docRef = await db.collection('messages').add(chatMessage);

    // ✅ MENGIRIM DATA LENGKAP KE PUSHER
    await pusher.trigger('chat-channel', 'new-message', {
        id: docRef.id,
        ...chatMessage
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'success', id: docRef.id })
    };
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process message.' })
    };
  }
};
