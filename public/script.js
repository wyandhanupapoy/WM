// Membungkus semua kode di dalam DOMContentLoaded untuk memastikan HTML sudah siap
document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // == PENGATURAN WAJIB - GANTI NILAI DI BAWAH INI ==
    // =================================================================

    // 1. Masukkan 'key' dari aplikasi Pusher Channels Anda
    const PUSHER_KEY = '5c82ec0166360a9e296b';

    // 2. Masukkan 'cluster' dari aplikasi Pusher Channels Anda
    const PUSHER_CLUSTER = 'ap1';

    // 3. Masukkan URL LENGKAP dari Netlify Function Anda
    const NETLIFY_FUNCTION_URL = 'https://chatwm.netlify.app/.netlify/functions/send-message';

    const GET_HISTORY_URL = 'https://chatwm.netlify.app/.netlify/functions/get-chat-history'; // Ganti dengan URL Netlify yang sesuai

    const SEND_MESSAGE_URL = 'https://chatwm.netlify.app/.netlify/functions/send-message';
    // =================================================================
    // == AKHIR DARI PENGATURAN WAJIB ==
    // =================================================================
    // 1. Salin objek konfigurasi Firebase Anda di sini
    const firebaseConfig = {
        apiKey: "AIzaSyAdNwK-04FA4fxOEZQ2FDWpjzRYv4SG6zA",
        authDomain: "chat-wm-database.firebaseapp.com",
        projectId: "chat-wm-database",
        storageBucket: "chat-wm-database.firebasestorage.app",
        messagingSenderId: "159386402313",
        appId: "1:159386402313:web:e7bba7e53123c88fad82d8",
        measurementId: "G-L4EYC054G4"
    };

    // --- Inisialisasi Layanan ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe('chat-channel');

    // --- Variabel Global & Elemen DOM ---
    let currentUser = null;
    const authScreen = document.getElementById('auth-screen');
    const chatScreen = document.getElementById('chat-screen');
    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authTitle = document.getElementById('auth-title');
    const authToggleText = document.getElementById('auth-toggle-text');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const messagesContainer = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    let isLoginMode = true;

    // --- Fungsi-Fungsi ---

    // DENGAN FUNGSI BARU INI:
    function displayMessage(data) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        // Cek jika pengirim adalah pengguna saat ini (berdasarkan email)
        if (currentUser && data.username === currentUser.email) {
            messageWrapper.classList.add('own');
        }

        // **PERBAIKAN BUG INVALID DATE DIMULAI DI SINI**
        let dateObject;
        // Cek jika timestamp adalah objek dari Firestore (dari riwayat)
        if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp._seconds) {
            dateObject = new Date(data.timestamp._seconds * 1000);
        }
        // Cek jika timestamp adalah string (dari Pusher real-time) atau angka
        else if (data.timestamp) {
            dateObject = new Date(data.timestamp);
        }
        // Jika tidak ada timestamp, buat tanggal saat ini
        else {
            dateObject = new Date();
        }

        // Pastikan dateObject valid sebelum memformatnya
        const time = !isNaN(dateObject)
            ? dateObject.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '';
        // **PERBAIKAN BUG SELESAI**

        messageBubble.innerHTML = `
        <p class="text">${data.message}</p>
        <span class="time">${time}</span>
    `;

        messageWrapper.appendChild(messageBubble);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function fetchWithAuth(url, options = {}) {
        if (!currentUser) throw new Error("User not logged in");
        const idToken = await currentUser.getIdToken(true);
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        };
        return fetch(url, { ...options, headers });
    }

    async function fetchChatHistory() {
        try {
            const response = await fetchWithAuth(GET_HISTORY_URL);
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const history = await response.json();
            messagesContainer.innerHTML = '';
            history.forEach(displayMessage);
        } catch (error) {
            console.error('Could not fetch chat history:', error);
        }
    }

    // --- Logika Otentikasi ---

    // **PERBAIKAN:** Menggunakan Event Delegation. Kita menaruh listener di parent.
    authToggleText.addEventListener('click', (e) => {
        // Mencegah link dari refresh halaman
        e.preventDefault();
        // Hanya jalankan jika yang diklik adalah link <a>
        if (e.target.tagName === 'A') {
            isLoginMode = !isLoginMode;
            authTitle.textContent = isLoginMode ? 'Login' : 'Daftar Akun Baru';
            authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Daftar';
            authToggleText.innerHTML = isLoginMode
                ? 'Belum punya akun? <a href="#">Daftar di sini</a>'
                : 'Sudah punya akun? <a href="#">Login di sini</a>';
            authError.textContent = '';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        authError.textContent = '';
        try {
            if (isLoginMode) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
        } catch (error) {
            console.error("Authentication error:", error.message);
            authError.textContent = error.message;
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // --- Pendengar Utama Status Otentikasi ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            userInfo.textContent = `Login sebagai: ${user.email}`;
            fetchChatHistory();
        } else {
            currentUser = null;
            authScreen.classList.remove('hidden');
            chatScreen.classList.add('hidden');
        }
    });

    // --- Event Listeners Lainnya ---
    channel.bind('new-message', displayMessage);

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message && currentUser) {
            try {
                await fetchWithAuth(SEND_MESSAGE_URL, {
                    method: 'POST',
                    body: JSON.stringify({ message: message }),
                });
                messageInput.value = '';
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Gagal mengirim pesan.');
            }
        }
    });
});

