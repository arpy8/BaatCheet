---
title: Baatcheet
emoji: 📚
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# BaatCheet: Secure P2P Video Communication

![BaatCheet Logo](https://img.shields.io/badge/BaatCheet-Secure%20P2P%20Communication-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

BaatCheet is a secure peer-to-peer video communication platform built using WebRTC technology. It enables real-time audio and video communication directly between browsers without requiring any plugins or third-party servers for media relay (except in specific NAT traversal scenarios).

## Features

- **Secure P2P Communication**: Direct browser-to-browser communication using WebRTC
- **Simple Room Creation**: Generate unique room IDs for private conversations
- **Multiple Participant Support**: Connect with multiple peers in the same room
- **Media Controls**: Toggle audio and video streams on/off
- **Responsive UI**: Works on both desktop and mobile devices
- **Low Latency**: Direct peer connections ensure minimal delay
- **NAT Traversal**: Uses STUN/TURN servers to bypass network restrictions

## Technology Stack

- **Frontend**:
  - Vanilla JavaScript (ES6+)
  - Socket.IO Client
  - WebRTC APIs
  - Tailwind CSS for styling

- **Backend**:
  - Node.js
  - Express
  - Socket.IO for signaling
  - Winston for logging

## Architecture

```mermaid
flowchart TD
    subgraph Client
        UI[UI Manager]
        ClientApp[BaatCheet Client]
        NotificationMgr[Notification Manager]
        BackgroundFX[Background Effects]
        
        ClientApp -- Updates --> UI
        ClientApp -- Sends --> NotificationMgr
        UI -- Renders --> BackgroundFX
    end
    
    subgraph WebRTC
        PeerConnection[Peer Connections]
        ICE[ICE Candidates]
        MediaStream[Media Stream API]
        
        PeerConnection -- Exchanges --> ICE
        PeerConnection -- Manages --> MediaStream
    end
    
    subgraph Server
        Express[Express Server]
        SocketIO[Socket.IO]
        RoomManager[Room Management]
        
        Express -- Hosts --> SocketIO
        SocketIO -- Manages --> RoomManager
    end
    
    ClientApp -- Signaling --> SocketIO
    PeerConnection -- Direct P2P Connection --> RemoteClient[Remote Client]
    ClientApp -- Uses --> PeerConnection
    PeerConnection -- Uses --> STUN/TURN[STUN/TURN Servers]
```

## Connection Flow

```mermaid
sequenceDiagram
    participant ClientA as Client A
    participant Server as Signaling Server
    participant ClientB as Client B
    
    ClientA->>Server: Join/Create Room
    Server->>ClientA: Room Joined (ID + participants)
    
    ClientB->>Server: Join Room
    Server->>ClientB: Room Joined (ID + participants)
    Server->>ClientA: Peer Joined (ClientB ID)
    
    ClientA->>Server: Send Offer
    Server->>ClientB: Relay Offer
    
    ClientB->>Server: Send Answer
    Server->>ClientA: Relay Answer
    
    ClientA->>Server: Send ICE Candidates
    Server->>ClientB: Relay ICE Candidates
    
    ClientB->>Server: Send ICE Candidates
    Server->>ClientA: Relay ICE Candidates
    
    ClientA->>ClientB: Direct P2P WebRTC Connection
    
    Note over ClientA,ClientB: Media streams now flow directly between peers
```

## Detailed Application Flow

```mermaid
flowchart TD
    Start([User opens application]) --> InitApp[Load application]
    InitApp --> InitBG[Initialize background effects]
    InitBG --> InitUI[Initialize UI manager]
    InitUI --> InitNotif[Initialize notification manager]
    InitNotif --> InitClient[Initialize BaatCheet client]
    
    subgraph Media Handling
        InitMedia[Initialize media devices]
        InitMedia --> GetUserMedia[Access camera and microphone]
        GetUserMedia -- Success --> DisplayLocalVideo[Display local video]
        GetUserMedia -- Error --> NotifyMediaError[Show media error notification]
    end
    
    subgraph Room Management
        CreateRoom[Create new room]
        JoinRoom[Join existing room]
        
        CreateRoom --> GenerateRoomID[Generate unique room ID]
        GenerateRoomID --> EmitJoinRoom[Emit join-room event]
        JoinRoom --> ValidateRoomID[Validate room ID input]
        ValidateRoomID --> EmitJoinRoom
        
        EmitJoinRoom --> UpdateURL[Update URL with room parameter]
        UpdateURL --> CopyToClipboard[Copy room ID to clipboard]
    end
    
    subgraph Peer Connection
        PeerJoined[Peer joined event]
        PeerJoined --> CreatePeerConn[Create RTCPeerConnection]
        CreatePeerConn --> CreateOffer[Create offer]
        CreateOffer --> SetLocalDesc[Set local description]
        SetLocalDesc --> SendOffer[Send offer to peer]
        
        ReceiveOffer[Receive offer from peer]
        ReceiveOffer --> CreatePeerConnAnswer[Create RTCPeerConnection]
        CreatePeerConnAnswer --> SetRemoteDesc[Set remote description]
        SetRemoteDesc --> CreateAnswer[Create answer]
        CreateAnswer --> SetLocalDescAnswer[Set local description]
        SetLocalDescAnswer --> SendAnswer[Send answer to peer]
        
        ReceiveAnswer[Receive answer from peer]
        ReceiveAnswer --> SetRemoteDescAnswer[Set remote description]
        
        IceCandidate[ICE candidate event]
        IceCandidate --> SendIceCandidate[Send ICE candidate to peer]
        
        ReceiveIceCandidate[Receive ICE candidate from peer]
        ReceiveIceCandidate --> AddIceCandidate[Add ICE candidate]
    end
    
    subgraph Media Controls
        ToggleVideo[Toggle video]
        ToggleAudio[Toggle audio]
        
        ToggleVideo --> UpdateVideoTracks[Update video track enabled state]
        UpdateVideoTracks --> UpdateVideoUI[Update video UI]
        UpdateVideoUI --> NotifyPeersVideo[Notify peers about video state]
        
        ToggleAudio --> UpdateAudioTracks[Update audio track enabled state]
        UpdateAudioTracks --> UpdateAudioUI[Update audio UI]
        UpdateAudioUI --> NotifyPeersAudio[Notify peers about audio state]
    end
    
    subgraph Disconnection
        UserLeave[User leaves page]
        PeerDisconnect[Peer disconnects]
        
        UserLeave --> StopLocalTracks[Stop local media tracks]
        StopLocalTracks --> ClosePeerConns[Close peer connections]
        ClosePeerConns --> EmitLeaveRoom[Emit leave-room event]
        
        PeerDisconnect --> CleanupPeerConn[Close peer connection]
        CleanupPeerConn --> RemovePeerVideo[Remove peer's video element]
        RemovePeerVideo --> NotifyPeerLeft[Show notification about peer leaving]
    end
    
    InitClient --> InitMedia
    InitMedia -- On page load --> CheckURLParams[Check URL for room parameter]
    CheckURLParams -- Room ID present --> JoinRoom
    CheckURLParams -- No Room ID --> WaitForUserAction[Wait for user action]
    
    WaitForUserAction -- Create button clicked --> CreateRoom
    WaitForUserAction -- Join button clicked --> JoinRoom
    
    EmitJoinRoom -- Socket event --> HandleSocketEvents[Set up socket event handlers]
    HandleSocketEvents -- peer-joined --> PeerJoined
    HandleSocketEvents -- offer --> ReceiveOffer
    HandleSocketEvents -- answer --> ReceiveAnswer
    HandleSocketEvents -- ice-candidate --> ReceiveIceCandidate
    HandleSocketEvents -- peer-disconnected --> PeerDisconnect
    
    ToggleVideoBtn[Toggle video button]
    ToggleAudioBtn[Toggle audio button]
    ToggleVideoBtn -- Click --> ToggleVideo
    ToggleAudioBtn -- Click --> ToggleAudio
    
    BeforeUnload[Window beforeunload event]
    BeforeUnload --> UserLeave
```

## Project Structure

```
baatcheet/
├── src/
│   ├── client/
│   │   ├── assets/
│   │   │   └── favicon.ico
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── app.js            # Entry point for client
│   │   │   ├── background-effects.js  # Background animations
│   │   │   ├── baatcheet-client.js    # WebRTC core functionality
│   │   │   ├── notification-manager.js # Manages notifications
│   │   │   └── ui-manager.js     # Manages UI updates
│   │   └── index.html            # Main HTML file
│   └── server/
│       └── server.js             # Express and Socket.IO server
├── .dockerignore
├── .gitattributes
├── .gitignore
├── Dockerfile                    # For containerized deployment
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/arpy8/baatcheet.git
   cd baatcheet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:7860`

### Production Deployment

1. Using Docker:
   ```bash
   docker build -t baatcheet .
   docker run -p 7860:7860 baatcheet
   ```

2. Using Node.js directly:
   ```bash
   npm install
   npm start
   ```

## Usage Guide

### Creating a Room
1. Open the BaatCheet application in your browser
2. Click "Create Room" button
3. The application will generate a unique room ID
4. Share this room ID with others you want to connect with

### Joining a Room
1. Open the BaatCheet application in your browser
2. Enter the room ID in the input field
3. Click "Join Room" button
4. You will be connected to others in the same room

### Media Controls
- Toggle your video on/off using the video button
- Toggle your microphone on/off using the audio button

### Sharing Room Links
You can share a direct link to your room by copying the URL after joining, which will include the room ID as a parameter.

## Browser Support

BaatCheet is supported on all modern browsers that implement WebRTC:
- Chrome (version 60+)
- Firefox (version 55+)
- Safari (version 11+)
- Edge (version 79+)

## Security Considerations

- All media streams are transferred directly between peers using encrypted WebRTC connections
- The signaling server only relays connection information and does not have access to media content
- No media data is stored on any server

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.