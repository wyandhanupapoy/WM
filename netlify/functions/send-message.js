const Pusher = require('pusher');

// Konfigurasi Pusher dari Environment Variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Ini adalah fungsi utama yang akan dijalankan oleh Netlify
exports.handler = async (event) => {
  // Header untuk izin CORS
  const headers = {
    'Access-Control-Allow-Origin': 'https://wyandhanupapoy.github.io', // Izinkan HANYA domain GitHub Anda
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Jika ini adalah permintaan 'pemanasan' (preflight OPTIONS), langsung berikan izin dan selesai.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: headers,
      body: ''
    };
  }
  
  // Hanya proses permintaan POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { username, message } = JSON.parse(event.body);

    // Memicu event Pusher
    await pusher.trigger('chat-channel', 'new-message', {
      username: username,
      message: message
    });

    return {
      statusCode: 200,
      headers: headers, // Kirim juga header di respons sukses
      body: JSON.stringify({ status: 'success' })
    };
  } catch (error) {
    // Jika ada error di server, kirim log dan respons error
    console.error('SERVER ERROR:', error);
    return {
      statusCode: 500,
      headers: headers, // Kirim juga header di respons error
      body: JSON.stringify({ error: 'Failed to send message on server' })
    };
  }
};