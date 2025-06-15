const Pusher = require('pusher');
const admin = require('firebase-admin');

// Inisialisasi Firebase & Pusher (Salin dari fungsi Anda yang sudah ada)
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
    });
  }
} catch (e) { console.error("Firebase init error", e); }

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

  // Verifikasi Token Pengguna
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: 'Unauthorized' };
  }
  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { statusCode: 403, headers, body: 'Forbidden: Invalid token' };
  }
  
  const userEmail = decodedToken.email;
  const { messageId } = JSON.parse(event.body);

  if (!messageId) {
    return { statusCode: 400, headers, body: 'Message ID is required' };
  }

  try {
    const messageRef = db.collection('messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return { statusCode: 404, headers, body: 'Message not found' };
    }

    // Verifikasi kepemilikan sebelum menghapus
    if (messageDoc.data().username !== userEmail) {
      return { statusCode: 403, headers, body: 'Forbidden: You can only delete your own messages' };
    }

    // Hapus dokumen dari Firestore
    await messageRef.delete();

    // Beritahu semua klien bahwa pesan telah dihapus
    await pusher.trigger('chat-channel', 'message-deleted', { messageId });

    return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };
  } catch (error) {
    console.error("SERVER ERROR deleting message:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete message.' }) };
  }
};