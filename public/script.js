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

// Variabel Global
let username = '';

// Elemen DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinChatBtn = document.getElementById('join-chat-btn');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

// --- Inisialisasi Pusher ---
const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
const channel = pusher.subscribe('chat-channel');

// --- Fungsi-Fungsi ---
function displayMessage(data) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    if (data.username === username) {
        messageEl.classList.add('own');
    }
    // Konversi timestamp dari Firestore (jika ada) ke format yang lebih mudah dibaca
    const time = data.timestamp ? new Date(data.timestamp._seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    
    messageEl.innerHTML = `
        <div class="sender">${data.username} <span class="time">${time}</span></div>
        <div class="text">${data.message}</div>
    `;
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function fetchChatHistory() {
    if (!GET_HISTORY_URL || GET_HISTORY_URL.includes('URL_FUNGSI')) {
        console.warn("URL get history belum diatur");
        return;
    }
    try {
        const response = await fetch(GET_HISTORY_URL);
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        const history = await response.json();
        messagesContainer.innerHTML = ''; 
        history.forEach(displayMessage);
    } catch (error) {
        console.error('Could not fetch chat history:', error);
    }
}

function showChatUI(name) {
    username = name;
    userInfo.textContent = `Login sebagai: ${username}`;
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    fetchChatHistory();
    messageInput.focus();
}

// --- Event Listeners ---
channel.bind('new-message', displayMessage);

joinChatBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        localStorage.setItem('chat_username', name); // Simpan username
        showChatUI(name);
    }
});

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message && username) {
        try {
            await fetch(SEND_MESSAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, message }),
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Gagal mengirim pesan.');
        }
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('chat_username'); // Hapus username
    location.reload(); // Muat ulang halaman
});

// --- Logika Utama Saat Halaman Dimuat ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('chat_username');
    if (savedUsername) {
        // Jika ada username tersimpan, langsung masuk ke chat
        showChatUI(savedUsername);
    } else {
        // Jika tidak, tampilkan layar login
        loginScreen.classList.remove('hidden');
    }
});