from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
from typing import Dict

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Store active connections
active_connections: Dict[str, WebSocket] = {}

@app.get("/", response_class=HTMLResponse)
async def get():
    with open("index.html") as f:
        return f.read()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(id(websocket))
    active_connections[client_id] = websocket
    
    try:
        # Notify all existing peers about the new connection
        for peer_id, peer_ws in active_connections.items():
            if peer_id != client_id:
                await peer_ws.send_json({"type": "new-peer", "from": client_id})
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message["from"] = client_id
            
            if message["to"] == "all":
                # Broadcast to all other peers
                for peer_id, peer_ws in active_connections.items():
                    if peer_id != client_id:
                        await peer_ws.send_json(message)
            else:
                # Send to specific peer
                peer_ws = active_connections.get(message["to"])
                if peer_ws:
                    await peer_ws.send_json(message)
                    
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        del active_connections[client_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=80, reload=True)