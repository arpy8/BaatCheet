const socket = io();
let localStream;
let peerConnection;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Update status indicators
function updateStatus(isConnected) {
    const remoteStatus = document.querySelector('.remote-status');
    if (isConnected) {
        remoteStatus.classList.add('connected');
    } else {
        remoteStatus.classList.remove('connected');
    }
}

async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        document.querySelector('.local-status').classList.add('connected');

        createPeerConnection();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);

    } catch (error) {
        console.error('Error starting call:', error);
        alert('Error starting call: ' + error.message);
    }
}

function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }
    
    peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream1
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = event => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            console.log('Received remote stream');
        }
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        updateStatus(peerConnection.connectionState === 'connected');
    };
}

socket.on('offer', async offer => {
    try {
        if (!localStream) {
            await startCall();
        } else if (!peerConnection || peerConnection.connectionState === 'closed') {
            createPeerConnection();
        }
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async answer => {
    try {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('ice-candidate', async candidate => {
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
    if (peerConnection) {
        peerConnection.close();
    }
};

document.getElementById('startButton').addEventListener('click', startCall);
