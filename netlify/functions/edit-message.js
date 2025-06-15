const Pusher = require('pusher');
const admin = require('firebase-admin');

// Inisialisasi Firebase & Pusher (Salin dari fungsi Anda yang sudah ada)
// ... (sama seperti di atas)

exports.handler = async (event) => {
    // ... (CORS & Verifikasi Token - sama seperti di atas)

    const { messageId, newText } = JSON.parse(event.body);
    const userEmail = decodedToken.email;

    if (!messageId || !newText) {
        return { statusCode: 400, headers, body: 'Message ID and new text are required' };
    }

    try {
        const messageRef = db.collection('messages').doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return { statusCode: 404, headers, body: 'Message not found' };
        }

        // Verifikasi kepemilikan sebelum mengedit
        if (messageDoc.data().username !== userEmail) {
            return { statusCode: 403, headers, body: 'Forbidden: You can only edit your own messages' };
        }

        // Update dokumen di Firestore
        await messageRef.update({
            message: newText,
            isEdited: true
        });

        // Beritahu semua klien bahwa pesan telah diedit
        await pusher.trigger('chat-channel', 'message-edited', { messageId, newText });

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success' }) };
    } catch (error) {
        console.error("SERVER ERROR editing message:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to edit message.' }) };
    }
};