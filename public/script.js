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
const toggleToRegister = document.getElementById('toggle-to-register');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
let isLoginMode = true;

// --- Fungsi-Fungsi ---

function displayMessage(data) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    // Cek jika pengirim adalah pengguna saat ini (berdasarkan email)
    if (currentUser && data.username === currentUser.email) {
        messageEl.classList.add('own');
    }
    const time = data.timestamp ? new Date(data.timestamp._seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    
    messageEl.innerHTML = `
        <div class="sender">${data.username} <span class="time">${time}</span></div>
        <div class="text">${data.message}</div>
    `;
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Fungsi untuk mengambil data dengan menyertakan token otentikasi
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

// Toggle antara mode Login dan Registrasi
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login' : 'Daftar Akun Baru';
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Daftar';
    authToggleText.innerHTML = isLoginMode 
        ? 'Belum punya akun? <a href="#" id="toggle-to-register">Daftar di sini</a>'
        : 'Sudah punya akun? <a href="#" id="toggle-to-register">Login di sini</a>';
    document.getElementById('toggle-to-register').addEventListener('click', toggleAuthMode);
    authError.textContent = '';
}
toggleToRegister.addEventListener('click', toggleAuthMode);


// Handle submit form (login atau registrasi)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    authError.textContent = '';

    try {
        if (isLoginMode) {
            // Proses Login
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            // Proses Registrasi
            await auth.createUserWithEmailAndPassword(email, password);
        }
        // State change akan ditangani oleh onAuthStateChanged
    } catch (error) {
        console.error("Authentication error:", error.message);
        authError.textContent = error.message;
    }
});

// Proses Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- Pendengar Utama Status Otentikasi ---

auth.onAuthStateChanged(user => {
    if (user) {
        // Pengguna berhasil login
        currentUser = user;
        authScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        userInfo.textContent = `Login sebagai: ${user.email}`;
        fetchChatHistory();
    } else {
        // Pengguna logout atau belum login
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
                body: JSON.stringify({ message: message }), // username akan diambil dari token di backend
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Gagal mengirim pesan.');
        }
    }
});