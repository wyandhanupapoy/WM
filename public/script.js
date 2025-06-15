document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // == PENTING: ISI KEMBALI SEMUA KONFIGURASI ANDA DI SINI ==
    // JANGAN SIMPAN KUNCI ASLI DI REPOSITORI PUBLIK (contoh: GitHub)
    // ===================================================================
    const firebaseConfig = {
        apiKey: "AIzaSyAdNwK-04FA4fxOEZQ2FDWpjzRYv4SG6zA",
        authDomain: "chat-wm-database.firebaseapp.com",
        projectId: "chat-wm-database",
        storageBucket: "chat-wm-database.firebasestorage.app",
        messagingSenderId: "159386402313",
        appId: "1:159386402313:web:e7bba7e53123c88fad82d8",
        measurementId: "G-L4EYC054G4"
    };
    const PUSHER_KEY = '5c82ec0166360a9e296b';
    const PUSHER_CLUSTER = 'ap1';
    const SEND_MESSAGE_URL = 'https://chatwm.netlify.app/.netlify/functions/send-message';
    const GET_HISTORY_URL = 'https://chatwm.netlify.app/.netlify/functions/get-chat-history';

    // --- Inisialisasi Layanan ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe('chat-channel');

    // --- Elemen DOM ---
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

    // --- Variabel State ---
    let currentUser = null;
    let isLoginMode = true;

    // --- Fungsi-Fungsi ---
    function displayMessage(data) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        if (currentUser && data.username === currentUser.email) {
            messageWrapper.classList.add('own');
        }

        let senderNameHTML = '';
        if (!messageWrapper.classList.contains('own') && data.username) {
            const sanitizedUsername = data.username.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            senderNameHTML = `<div class="sender-name">${sanitizedUsername}</div>`;
        }

        let dateObject;
        if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp._seconds) {
            dateObject = new Date(data.timestamp._seconds * 1000);
        } else if (data.timestamp) {
            dateObject = new Date(data.timestamp);
        } else {
            dateObject = new Date(); // Fallback
        }

        const time = !isNaN(dateObject) ? dateObject.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

        messageBubble.innerHTML = `${senderNameHTML}<p class="text">${data.message}</p><span class="time">${time}</span>`;
        messageWrapper.appendChild(messageBubble);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function fetchWithAuth(url, options = {}) {
        if (!currentUser) throw new Error("User not logged in");
        const idToken = await currentUser.getIdToken(true);
        const headers = { ...options.headers, 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' };
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
    authToggleText.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName !== 'A') return;
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Login' : 'Daftar Akun Baru';
        authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Daftar';
        authToggleText.innerHTML = isLoginMode ? 'Belum punya akun? <a href="#">Daftar di sini</a>' : 'Sudah punya akun? <a href="#">Login di sini</a>';
        authError.textContent = '';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        authError.textContent = '';
        const originalText = authSubmitBtn.textContent;
        authSubmitBtn.innerHTML = '<div class="loading"></div>';
        authSubmitBtn.disabled = true;

        try {
            if (isLoginMode) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
        } catch (error) {
            authError.textContent = error.message;
        } finally {
            authSubmitBtn.textContent = originalText;
            authSubmitBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => { auth.signOut(); });

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
            userInfo.textContent = `${user.email}`;
            fetchChatHistory();
        } else {
            currentUser = null;
            authScreen.style.display = 'flex';
            chatScreen.style.display = 'none';
        }
    });

    // --- Event Listeners Lainnya ---
    channel.bind('new-message', displayMessage);

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message || !currentUser) return;

        const tempMessage = message;
        messageInput.value = '';

        try {
            await fetchWithAuth(SEND_MESSAGE_URL, {
                method: 'POST',
                body: JSON.stringify({ message: tempMessage }),
            });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Gagal mengirim pesan. Periksa konsol untuk detail.');
            messageInput.value = tempMessage;
        }
    });
});