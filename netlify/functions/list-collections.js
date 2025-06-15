// File: netlify/functions/list-collections.js

const { initializeFirebaseAdmin } = require('./utils/initialize');
const admin = initializeFirebaseAdmin();
const db = admin.firestore();

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    
    // Verifikasi token dan peran admin
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.admin !== true) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
        }

        // Ambil semua nama koleksi di root database
        const collections = await db.listCollections();
        const collectionIds = collections.map(col => col.id);

        console.log("Koleksi yang ditemukan:", collectionIds);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ collections: collectionIds })
        };

    } catch (error) {
        console.error("SERVER ERROR [list-collections]:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to list collections.' }) };
    }
};