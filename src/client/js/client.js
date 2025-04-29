export class BaatCheetClient {
    constructor({ uiManager, notificationManager, configuration }) {
        this.socket = io(window.location.origin);
        this.peerConnections = new Map();
        this.localStream = null;
        this.currentRoom = null;
        this.configuration = configuration;
        this.uiManager = uiManager;
        this.notificationManager = notificationManager;
        this.mediaState = {
            video: true,
            audio: true
        };
        
        this._initializeSocketEvents();
    }

    async initializeMedia() {
        this.uiManager.showLoading('Initializing media devices...');
        
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            document.getElementById('localVideo').srcObject = this.localStream;
            document.querySelector('.local-status').classList.add('connected');
            this.uiManager.hideLoading();
            
            return true;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.uiManager.hideLoading();
            throw error;
        }
    }

    async joinRoom(roomId = null) {
        this.uiManager.showLoading(roomId ? 'Joining room...' : 'Creating room...');
        
        try {
            if (!this.localStream) {
                await this.initializeMedia();
            }

            if (!roomId) {
                roomId = this._generateRoomId();
            }

            this.socket.emit('join-room', roomId);
            this.currentRoom = roomId;
            
            // Update URL with room ID without reloading page
            window.history.replaceState(null, '', `?room=${roomId}`);
            
            // Update UI to show room ID and copy button
            this.uiManager.updateRoomDisplay(roomId);
            
            // Copy room ID to clipboard
            await this._copyRoomIdToClipboard(roomId);
            
        } catch (error) {
            console.error('Failed to join room:', error);
            this.notificationManager.showNotification(
                `Failed to join room: ${error.message}`, 
                'error'
            );
            this.uiManager.hideLoading();
        }
    }

    toggleVideo() {
        if (!this.localStream) return;
        
        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length === 0) return;
        
        this.mediaState.video = !this.mediaState.video;
        videoTracks.forEach(track => {
            track.enabled = this.mediaState.video;
        });
        
        // Update UI
        this.uiManager.updateVideoState(this.mediaState.video);
        
        // Notify peers about state change
        if (this.currentRoom) {
            this.socket.emit('media-state-change', {
                roomId: this.currentRoom,
                type: 'video',
                enabled: this.mediaState.video
            });
        }
    }

    toggleAudio() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) return;
        
        this.mediaState.audio = !this.mediaState.audio;
        audioTracks.forEach(track => {
            track.enabled = this.mediaState.audio;
        });
        
        // Update UI
        this.uiManager.updateAudioState(this.mediaState.audio);
        
        // Notify peers about state change
        if (this.currentRoom) {
            this.socket.emit('media-state-change', {
                roomId: this.currentRoom,
                type: 'audio',
                enabled: this.mediaState.audio
            });
        }
    }

    cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        if (this.currentRoom) {
            this.socket.emit('leave-room', this.currentRoom);
        }
    }

    _initializeSocketEvents() {
        this.socket.on('peer-joined', async (peerId) => {
            this.notificationManager.showNotification(`New peer joined: ${peerId.slice(0, 4)}`);
            // Play sound when a new peer joins
            this.audioManager.playUserJoinSound();
            
            try {
                const pc = this._createPeerConnection(peerId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.socket.emit('offer', { 
                    offer, 
                    roomId: this.currentRoom, 
                    to: peerId,
                    mediaState: this.mediaState
                });
            } catch (error) {
                console.error('Error creating offer:', error);
                this.notificationManager.showNotification(
                    'Failed to establish connection with new peer',
                    'error'
                );
            }
        });

        this.socket.on('room-joined', ({ roomId, participants }) => {
            console.log(`Joined room ${roomId} with ${participants.length} participants`);
            this.notificationManager.showNotification(
                `Successfully joined room with ${participants.length} participant(s)`
            );
            this.uiManager.hideLoading();

            // Play sound when user joins a room
            this.audioManager.playSelfJoinSound();

            // Set up connections with all existing participants
            for (const peerId of participants) {
                if (!this.peerConnections.has(peerId)) {
                    this._createPeerConnection(peerId);
                }
            }
        });

        this.socket.on('offer', async ({ offer, from, mediaState }) => {
            try {
                const pc = this._createPeerConnection(from);
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                this.socket.emit('answer', { 
                    answer, 
                    roomId: this.currentRoom, 
                    to: from,
                    mediaState: this.mediaState
                });
                
                // Update peer's media state if provided
                if (mediaState) {
                    this.uiManager.updatePeerMediaState(from, mediaState);
                }
                
            } catch (error) {
                console.error('Error handling offer:', error);
                this.notificationManager.showNotification(
                    'Failed to answer connection request',
                    'error'
                );
            }
        });

        this.socket.on('answer', async ({ answer, from, mediaState }) => {
            try {
                const pc = this.peerConnections.get(from);
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    
                    // Update peer's media state if provided
                    if (mediaState) {
                        this.uiManager.updatePeerMediaState(from, mediaState);
                    }
                }
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        });

        this.socket.on('ice-candidate', async ({ candidate, from }) => {
            try {
                const pc = this.peerConnections.get(from);
                if (pc) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        });

        this.socket.on('peer-disconnected', (peerId) => {
            if (this.peerConnections.has(peerId)) {
                this.peerConnections.get(peerId).close();
                this.peerConnections.delete(peerId);
            }
            
            this.uiManager.removePeerVideo(peerId);
            this.notificationManager.showNotification(`Peer disconnected: ${peerId.slice(0, 4)}`);
            // Play sound when a peer leaves the room
            this.audioManager.playUserLeaveSound();
        });

        this.socket.on('media-state-change', ({ from, type, enabled }) => {
            this.uiManager.updatePeerMediaState(from, { [type]: enabled });
        });

        this.socket.on('connection-error', (error) => {
            this.notificationManager.showNotification(`Connection error: ${error}`, 'error');
            this.uiManager.hideLoading();
        });
    }

    _createPeerConnection(peerId) {
        if (this.peerConnections.has(peerId)) {
            this.peerConnections.get(peerId).close();
        }

        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(peerId, peerConnection);

        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = event => {
            this.uiManager.addPeerVideo(peerId, event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate && this.currentRoom) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    roomId: this.currentRoom,
                    to: peerId
                });
            }
        };

        // Log connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state change: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === 'connected') {
                this.uiManager.updatePeerConnectionState(peerId, true);
            } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
                this.uiManager.updatePeerConnectionState(peerId, false);
            }
        };

        // Log ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state change: ${peerConnection.iceConnectionState}`);
        };

        return peerConnection;
    }

    _generateRoomId() {
        return Math.random().toString(36).substring(2, 15);
    }

    async _copyRoomIdToClipboard(roomId) {
        try {
            await navigator.clipboard.writeText(roomId);
            this.notificationManager.showNotification('Room ID copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
}
