// Get DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');

// Configuration options for WebRTC
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const peerConnections = new Map(); // Keep track of all peer connections

let localStream;
let ws;

async function init() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        document.getElementById('localVideo').srcObject = localStream;
        connectSignalingServer();
    } catch (e) {
        console.error('Error accessing media devices:', e);
        alert('Please allow camera and microphone access to use this app.');
    }
}

function connectSignalingServer() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        const { type, from, data } = message;

        if (!peerConnections.has(from) && type === 'new-peer') {
            createPeerConnection(from, true);
        }

        const pc = peerConnections.get(from);
        if (!pc) return;

        switch (type) {
            case 'offer':
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignalingMessage('answer', from, answer);
                break;

            case 'answer':
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                break;

            case 'ice-candidate':
                if (data) {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                }
                break;
        }
    };

    ws.onopen = () => {
        console.log('Connected to signaling server');
        sendSignalingMessage('new-peer', 'all');
    };
}

function createPeerConnection(peerId, isInitiator = false) {
    if (peerConnections.has(peerId)) {
        console.log('Peer connection already exists:', peerId);
        return peerConnections.get(peerId);
    }

    console.log('Creating peer connection for:', peerId);
    const pc = new RTCPeerConnection(configuration);
    peerConnections.set(peerId, pc);

    // Add local stream
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log('Added local track:', track.kind);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignalingMessage('ice-candidate', peerId, event.candidate);
        }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            handlePeerDisconnection(peerId);
        }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        const remoteVideo = document.getElementById(`peer-${peerId}`) || createRemoteVideo(peerId);
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    if (isInitiator) {
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                console.log('Sending offer to:', peerId);
                sendSignalingMessage('offer', peerId, pc.localDescription);
            })
            .catch(err => console.error('Error creating offer:', err));
    }

    return pc;
}

function createRemoteVideo(peerId) {
    const videoElement = document.createElement('video');
    videoElement.id = `peer-${peerId}`;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.classList.add('remote-video');
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'camera-card';
    cardDiv.innerHTML = `
        <div class="card-header">
            <span class="card-title">Remote User</span>
            <svg class="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>
        </div>
    `;
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.appendChild(videoElement);
    
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.appendChild(videoContainer);
    
    cardDiv.appendChild(cardContent);
    document.getElementById('remoteVideos').appendChild(cardDiv);
    
    return videoElement;
}

function handlePeerDisconnection(peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
        pc.close();
        peerConnections.delete(peerId);
    }
    
    const remoteVideo = document.getElementById(`peer-${peerId}`);
    if (remoteVideo) {
        remoteVideo.parentElement.parentElement.parentElement.remove();
    }
}

function sendSignalingMessage(type, to, data = null) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, to, data }));
    }
}

window.addEventListener('load', init);
window.addEventListener('beforeunload', () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnections.forEach(pc => pc.close());
});

// Start camera when page loads
document.addEventListener('DOMContentLoaded', () => {
    startCamera();
});

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Display local video stream
        localVideo.srcObject = stream;
        
        // Handle stream start
        localVideo.onloadedmetadata = () => {
            localVideo.play();
        };

    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please check permissions.');
    }
}