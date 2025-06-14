const Pusher = require('pusher');
const admin = require('firebase-admin');

// Inisialisasi
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
  }
} catch (e) { console.error("Firebase init error", e); }

const pusher = new Pusher({ /* ...konfigurasi pusher Anda... */ });
const db = admin.firestore();

exports.handler = async (event) => {
  // Verifikasi Token Otentikasi
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Unauthorized: Missing or invalid token' };
  }
  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { statusCode: 403, body: 'Forbidden: Invalid token' };
  }
  // Dari sini, kita tahu pengguna sah. `decodedToken` berisi info user.
  const userEmail = decodedToken.email;

  // Kode lama Anda dimulai dari sini...
  const { message } = JSON.parse(event.body);
  const chatMessage = {
    username: userEmail, // Gunakan email dari token, bukan dari frontend
    message: message,
    timestamp: new Date()
  };

  try {
    await db.collection('messages').add(chatMessage);
    await pusher.trigger('chat-channel', 'new-message', chatMessage);
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Success' };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};