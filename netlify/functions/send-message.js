// File: netlify/functions/send-message.js
const { initializeFirebaseAdmin, initializePusher } = require('./utils/initialize');
const admin = initializeFirebaseAdmin();
const pusher = initializePusher();
const db = admin.firestore();

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    // Verifikasi Token Pengguna
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userEmail = decodedToken.email;
        const { message, imageUrl } = JSON.parse(event.body);

        // Validasi: Pesan harus memiliki setidaknya teks atau gambar
        if (!message && !imageUrl) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message content (text or image) is required.' }) };
        }

        const chatMessage = {
            username: userEmail,
            message: message || '',
            imageUrl: imageUrl || null,
            timestamp: new Date(),
            isEdited: false,
        };

        const docRef = await db.collection('messages').add(chatMessage);
        
        // Kirim data lengkap ke Pusher, termasuk ID dokumen yang baru dibuat
        await pusher.trigger('chat-channel', 'new-message', {
            id: docRef.id,
            ...chatMessage,
            timestamp: chatMessage.timestamp.toISOString(), // Kirim sebagai ISO string
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'success', id: docRef.id })
        };
    } catch (error) {
        console.error("SERVER ERROR [send-message]:", error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Invalid or expired token.' }) };
        }
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process message.' })
        };
    }
};
