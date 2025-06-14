const admin = require('firebase-admin');

// Inisialisasi Firebase HANYA SEKALI
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  // (Untuk sekarang kita ambil semua chat, nanti bisa difilter per kontak)
  try {
    const snapshot = await db.collection('messages').orderBy('timestamp').get();
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }, // Izinkan akses
      body: JSON.stringify(messages)
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};