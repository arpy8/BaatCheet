export class UIManager {
    constructor() {
        this.loadingElement = document.getElementById('loading');
        this.loadingTextElement = document.getElementById('loadingText');
        this.videoGrid = document.querySelector('.video-grid');
        this.localVideo = document.getElementById('localVideo');
        this.toggleVideoBtn = document.getElementById('toggleVideo');
        this.toggleAudioBtn = document.getElementById('toggleAudio');
    }

    showLoading(message) {
        this.loadingTextElement.textContent = message;
        this.loadingElement.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingElement.classList.add('hidden');
    }

    updateRoomDisplay(roomId) {
        const roomIdElement = document.getElementById('roomId');
        roomIdElement.classList.remove('hidden');
        roomIdElement.innerHTML = `Room: <span class="cursor-pointer hover:text-white" title="Click to copy">${roomId}</span>`;
        
        roomIdElement.querySelector('span').onclick = () => {
            navigator.clipboard.writeText(roomId)
                .then(() => {
                    // Use the notification system from the client
                    const notificationEvent = new CustomEvent('notification', {
                        detail: {
                            message: 'Room ID copied to clipboard!',
                            type: 'success'
                        }
                    });
                    document.dispatchEvent(notificationEvent);
                    
                    // Visual feedback on the span
                    const span = roomIdElement.querySelector('span');
                    const originalText = span.textContent;
                    span.textContent = 'Copied!';
                    setTimeout(() => {
                        span.textContent = originalText;
                    }, 2000);
                });
        };
    }

    addPeerVideo(peerId, stream) {
        // Check if video element for this peer already exists
        let container = document.getElementById(`container-${peerId}`);
        let remoteVideo;
        
        if (!container) {
            // Create new container and video elements
            container = this._createVideoContainer(peerId);
            this.videoGrid.appendChild(container);
            remoteVideo = container.querySelector('video');
        } else {
            remoteVideo = document.getElementById(`video-${peerId}`);
        }
        
        remoteVideo.srcObject = stream;
        container.querySelector('.remote-status').classList.add('connected');
        
        return remoteVideo;
    }

    removePeerVideo(peerId) {
        const container = document.getElementById(`container-${peerId}`);
        if (container) {
            // Add fade-out animation
            container.style.opacity = '0';
            container.style.transform = 'scale(0.9)';
            
            // Remove after animation completes
            setTimeout(() => {
                container.remove();
            }, 300);
        }
    }
    
    updateVideoState(enabled) {
        // Update button state
        if (enabled) {
            this.toggleVideoBtn.classList.remove('off');
        } else {
            this.toggleVideoBtn.classList.add('off');
        }
        
        // Update video display
        if (!enabled) {
            this.localVideo.classList.add('video-off');
        } else {
            this.localVideo.classList.remove('video-off');
        }
    }
    
    updateAudioState(enabled) {
        // Update button state
        if (enabled) {
            this.toggleAudioBtn.classList.remove('off');
            document.querySelector('.local-status').parentNode.classList.remove('audio-off');
        } else {
            this.toggleAudioBtn.classList.add('off');
            document.querySelector('.local-status').parentNode.classList.add('audio-off');
        }
    }
    
    updatePeerMediaState(peerId, mediaState) {
        const container = document.getElementById(`container-${peerId}`);
        if (!container) return;
        
        const video = container.querySelector('video');
        
        if (mediaState.hasOwnProperty('video')) {
            if (!mediaState.video) {
                video.classList.add('video-off');
            } else {
                video.classList.remove('video-off');
            }
        }
        
        if (mediaState.hasOwnProperty('audio')) {
            const statusIndicator = container.querySelector('.remote-status').parentNode;
            if (!mediaState.audio) {
                statusIndicator.classList.add('audio-off');
            } else {
                statusIndicator.classList.remove('audio-off');
            }
        }
    }
    
    updatePeerConnectionState(peerId, connected) {
        const container = document.getElementById(`container-${peerId}`);
        if (!container) return;
        
        const statusIndicator = container.querySelector('.remote-status');
        if (connected) {
            statusIndicator.classList.add('connected');
        } else {
            statusIndicator.classList.remove('connected');
        }
    }

    _createVideoContainer(peerId) {
        const container = document.createElement('div');
        container.className = 'video-container';
        container.id = `container-${peerId}`;
        container.style.opacity = '0';
        container.style.transform = 'scale(0.9)';
        
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
        
        // Trigger animation in next frame
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        }, 10);
        
        return container;
    }
}
