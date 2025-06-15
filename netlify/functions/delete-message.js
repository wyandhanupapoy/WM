// File: netlify/functions/delete-message.js
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

    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userEmail = decodedToken.email;
        const { messageId } = JSON.parse(event.body);

        if (!messageId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message ID is required.' }) };
        }

        const messageRef = db.collection('messages').doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Message not found.' }) };
        }
        if (messageDoc.data().username !== userEmail) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: You can only delete your own messages.' }) };
        }

        await messageRef.delete();

        await pusher.trigger('chat-channel', 'message-deleted', { messageId });

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };

    } catch (error) {
        console.error("SERVER ERROR [delete-message]:", error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: Invalid or expired token.' }) };
        }
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete message.' }) };
    }
};
