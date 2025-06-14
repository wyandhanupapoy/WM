const Pusher = require('pusher');

// Konfigurasi Pusher dari Environment Variables (lebih aman)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Ini adalah fungsi utama yang akan dijalankan oleh Netlify
exports.handler = async (event) => {
  // Hanya izinkan metode POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, message } = JSON.parse(event.body);

    // Memicu event 'new-message' di channel 'chat-channel'
    await pusher.trigger('chat-channel', 'new-message', {
      username: username,
      message: message
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send message' })
    };
  }
};