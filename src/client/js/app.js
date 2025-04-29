import { BaatCheetClient } from './client.js';
import { UIManager } from './ui-manager.js';
import { NotificationManager } from './notification-manager.js';
import { BackgroundEffects } from './background.js';
import { AudioManager } from './audio-manager.js';

const backgroundEffects = new BackgroundEffects();
backgroundEffects.init();

const uiManager = new UIManager();

const notificationManager = new NotificationManager('notification');

const audioManager = new AudioManager();

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

client.audioManager = audioManager;

document.getElementById('joinBtn').addEventListener('click', () => {
    const roomInput = document.getElementById('roomInput').value.trim();
    if (roomInput) {
        client.joinRoom(roomInput);
    } else {
        notificationManager.showNotification('Please enter a room ID', 'error');
    }
});

document.getElementById('createBtn').addEventListener('click', () => {
    client.joinRoom();
});

document.getElementById('toggleVideo').addEventListener('click', () => {
    client.toggleVideo();
});

document.getElementById('toggleAudio').addEventListener('click', () => {
    client.toggleAudio();
});

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        document.getElementById('roomInput').value = roomId;
        
        setTimeout(() => {
            client.joinRoom(roomId);
        }, 500);
    }
    
    client.initializeMedia().catch(error => {
        notificationManager.showNotification(`Media access error: ${error.message}`, 'error');
    });
});

window.addEventListener('beforeunload', () => {
    client.cleanup();
});
