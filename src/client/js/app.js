import { BaatCheetClient } from './baatcheet-client.js';
import { UIManager } from './ui-manager.js';
import { NotificationManager } from './notification-manager.js';
import { BackgroundEffects } from './background-effects.js';
import { AudioManager } from './audio-manager.js';

// Initialize background effects
const backgroundEffects = new BackgroundEffects();
backgroundEffects.init();

// Initialize the UI manager
const uiManager = new UIManager();

// Initialize notification manager
const notificationManager = new NotificationManager('notification');

// Initialize audio manager
const audioManager = new AudioManager();

// Initialize the BaatCheet client
const client = new BaatCheetClient({
    uiManager,
    notificationManager,
    configuration: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        ]
    }
});

// Add audio manager to client
client.audioManager = audioManager;

// Set up event listeners
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomInput = document.getElementById('roomInput').value.trim();
    if (roomInput) {
        client.joinRoom(roomInput);
    } else {
        notificationManager.showNotification('Please enter a room ID', 'error');
    }
});

document.getElementById('createBtn').addEventListener('click', () => {
    client.joinRoom(); // No roomId means create a new room
});

document.getElementById('toggleVideo').addEventListener('click', () => {
    client.toggleVideo();
});

document.getElementById('toggleAudio').addEventListener('click', () => {
    client.toggleAudio();
});

// Check URL for room parameter on page load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        document.getElementById('roomInput').value = roomId;
        
        // Auto-join the room after a short delay to ensure page is fully loaded
        setTimeout(() => {
            client.joinRoom(roomId);
        }, 500);
    }
    
    // Initialize media if permitted
    client.initializeMedia().catch(error => {
        notificationManager.showNotification(`Media access error: ${error.message}`, 'error');
    });
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    client.cleanup();
});
