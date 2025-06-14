// =================================================================
// == PENGATURAN WAJIB - GANTI NILAI DI BAWAH INI ==
// =================================================================

// 1. Masukkan 'key' dari aplikasi Pusher Channels Anda
const PUSHER_KEY = '5c82ec0166360a9e296b';

// 2. Masukkan 'cluster' dari aplikasi Pusher Channels Anda
const PUSHER_CLUSTER = 'ap1';

// 3. Masukkan URL LENGKAP dari Netlify Function Anda
const NETLIFY_FUNCTION_URL = 'GANTI_DENGAN_URL_LENGKAP_NETLIFY_FUNCTION_ANDA';

// =================================================================
// == AKHIR DARI PENGATURAN WAJIB ==
// =================================================================

// Variabel untuk menyimpan nama pengguna saat ini
let username = '';

// Mengambil semua elemen HTML yang kita butuhkan
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinChatBtn = document.getElementById('join-chat-btn');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Inisialisasi Pusher dengan kunci dan cluster Anda
const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    useTLS: true
});

// Berlangganan (subscribe) ke channel bernama 'chat-channel'
// Nama ini harus sama persis dengan yang ada di backend (Netlify Function)
const channel = pusher.subscribe('chat-channel');

/**
 * Fungsi untuk menampilkan pesan di jendela chat.
 * @param {object} data - Objek data pesan yang berisi 'username' dan 'message'.
 */
function displayMessage(data) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');

    // Jika pesan dikirim oleh pengguna saat ini, beri kelas 'own' untuk styling
    if (data.username === username) {
        messageEl.classList.add('own');
    }

    // Struktur HTML untuk setiap pesan
    messageEl.innerHTML = `
        <div class="sender">${data.username}</div>
        <div class="text">${data.message}</div>
    `;

    // Tambahkan elemen pesan ke dalam kontainer
    messagesContainer.appendChild(messageEl);

    // Otomatis scroll ke pesan terbaru
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Mengikat (bind) event 'new-message' ke fungsi displayMessage.
// Setiap kali ada event 'new-message' di 'chat-channel', fungsi displayMessage akan dijalankan.
channel.bind('new-message', displayMessage);


/**
 * Event Listener untuk tombol "Gabung Chat"
 */
joinChatBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        username = name; // Simpan nama pengguna
        loginScreen.classList.add('hidden'); // Sembunyikan layar login
        chatScreen.classList.remove('hidden'); // Tampilkan layar chat
        messageInput.focus(); // Fokuskan ke input pesan
    } else {
        alert("Nama tidak boleh kosong!");
    }
});

// Menambahkan fungsionalitas 'Enter' pada input username
usernameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        joinChatBtn.click();
    }
});

/**
 * Event Listener untuk form pengiriman pesan
 */
messageForm.addEventListener('submit', async (e) => {
    // Mencegah form dari reload halaman
    e.preventDefault();

    const message = messageInput.value.trim();

    // Pastikan pesan tidak kosong dan URL backend sudah diisi
    if (message && NETLIFY_FUNCTION_URL !== 'GANTI_DENGAN_URL_LENGKAP_NETLIFY_FUNCTION_ANDA') {
        try {
            // Kirim data pesan ke backend (Netlify Function) menggunakan fetch API
            await fetch(NETLIFY_FUNCTION_URL, {
                method: 'POST', // Menggunakan metode POST
                headers: {
                    'Content-Type': 'application/json',
                },
                // Ubah objek JavaScript menjadi string JSON untuk dikirim
                body: JSON.stringify({
                    username: username,
                    message: message,
                }),
            });

            // Kosongkan input pesan setelah berhasil terkirim
            messageInput.value = '';

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Gagal mengirim pesan. Periksa konsol untuk detail.');
        }
    } else if (NETLIFY_FUNCTION_URL === 'GANTI_DENGAN_URL_LENGKAP_NETLIFY_FUNCTION_ANDA') {
        alert('Kesalahan Konfigurasi: URL Netlify Function belum diatur di script.js!');
    }
    
    // Fokuskan kembali ke input pesan
    messageInput.focus();
});