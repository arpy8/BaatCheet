const socket = io(window.location.origin);
let localStream;
let peerConnections = new Map(); // Store multiple peer connections
let currentRoom;

const configuration = {
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
};

// Add this function near the top with other utility functions
function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Add this after the socket initialization at the top
// Check URL for room parameter on page load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        const roomInput = document.getElementById('roomInput');
        roomInput.value = roomId;
    }
});

// Update status indicators
function updateStatus(isConnected) {
    const remoteStatus = document.querySelector('.remote-status');
    if (isConnected) {
        remoteStatus.classList.add('connected');
    } else {
        remoteStatus.classList.remove('connected');
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 15);
}

async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        document.querySelector('.local-status').classList.add('connected');
        return true;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showNotification('Error accessing camera/microphone: ' + error.message, 5000);
        return false;
    }
}

async function joinRoom(roomId = null) {
    if (!localStream) {
        const success = await initializeMedia();
        if (!success) return;
    }

    if (!roomId) {
        roomId = generateRoomId();
    }

    socket.emit('join-room', roomId);
    currentRoom = roomId;
    // Update URL with room ID
    window.history.replaceState(null, '', `?room=${roomId}`);

    // Copy room ID to clipboard and show notification
    navigator.clipboard.writeText(roomId)
        .then(() => {
            showNotification('Joined room: ' + roomId);
            setTimeout(() => {
                showNotification('Room ID copied to clipboard!');
            }, 2000);   
        })
        .catch(err => {
            console.error('Failed to copy:', err);
        });

    const roomIdElement = document.getElementById('roomId');
    roomIdElement.innerHTML = `Room : <span class="cursor-pointer hover:text-white" title="Click to copy">${roomId}</span>`;
    roomIdElement.querySelector('span').onclick = () => {
        navigator.clipboard.writeText(roomId)
            .then(() => {
                showNotification('Room ID copied to clipboard!');
                // Visual feedback on the span
                const span = roomIdElement.querySelector('span');
                const originalText = span.textContent;
                span.textContent = 'Copied!';
                setTimeout(() => {
                    span.textContent = originalText;
                }, 2000);
            })
            .catch(err => console.error('Failed to copy:', err));
    };
}

function createPeerConnection(peerId) {
    if (peerConnections.has(peerId)) {
        peerConnections.get(peerId).close();
    }

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.set(peerId, peerConnection);

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = event => {
        // Create or get video element for this peer
        let remoteVideo = document.getElementById(`video-${peerId}`);
        if (!remoteVideo) {
            remoteVideo = createRemoteVideoElement(peerId);
        }
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate && currentRoom) {
            socket.emit('ice-candidate', {
                candidate: event.candidate,
                roomId: currentRoom,
                to: peerId
            });
        }
    };

    return peerConnection;
}

function createRemoteVideoElement(peerId) {
    const videoGrid = document.querySelector('.video-grid');
    const container = document.createElement('div');
    container.className = 'video-container';
    container.id = `container-${peerId}`;

    container.innerHTML = `
        <div class="card-header flex items-center justify-between">
            <div class="flex items-center">
                <span class="status-indicator remote-status"></span>
                <h3 class="text-lg font-semibold">Remote Video</h3>
            </div>
            <span class="text-sm text-gray-400">Peer ${peerId.slice(0, 4)}</span>
        </div>
        <div class="p-4">
            <video id="video-${peerId}" autoplay playsinline></video>
        </div>
    `;

    videoGrid.appendChild(container);
    return container.querySelector('video');
}

// Update socket event handlers
socket.on('peer-joined', async (peerId) => {
    showNotification(`New peer joined: ${peerId.slice(0, 4)}`);
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId: currentRoom, to: peerId });
});

socket.on('room-joined', async ({ roomId, participants }) => {
    console.log(`Joined room ${roomId}`);
    showNotification(`Successfully joined room: ${roomId}`);

    // Set up connections with all existing participants
    for (const peerId of participants) {
        if (!peerConnections.has(peerId)) {
            createPeerConnection(peerId);
        }
    }
});

socket.on('peer-disconnected', (peerId) => {
    if (peerConnections.has(peerId)) {
        peerConnections.get(peerId).close();
        peerConnections.delete(peerId);
    }
    const container = document.getElementById(`container-${peerId}`);
    if (container) {
        container.remove();
    }
});

// Update existing socket handlers for offer/answer/ice-candidate
socket.on('offer', async ({ offer, from }) => {
    try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId: currentRoom, to: from });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async ({ answer, from }) => {
    try {
        const pc = peerConnections.get(from);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('ice-candidate', async ({ candidate, from }) => {
    try {
        const pc = peerConnections.get(from);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

// Clean up when leaving
window.onbeforeunload = () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    if (currentRoom) {
        socket.emit('leave-room', currentRoom);
    }
};