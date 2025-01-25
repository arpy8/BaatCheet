import os
import cv2
import secrets
from threading import Lock
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

load_dotenv()


USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")

app = FastAPI()
security = HTTPBasic()



# Camera setup
camera = None
camera_lock = Lock()

def get_camera():
    global camera
    if camera is None:
        camera = cv2.VideoCapture(0)
    return camera

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, USERNAME)
    correct_password = secrets.compare_digest(credentials.password, PASSWORD)
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials

def generate_frames():
    while True:
        with camera_lock:
            cam = get_camera()
            ret, frame = cam.read()
            if not ret:
                continue
            _, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video_feed")
def video_feed(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/", response_class=HTMLResponse)
def serve_index(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    with open("index.html", "r") as file:
        return file.read()

@app.on_event("startup")
async def startup_event():
    get_camera()

@app.on_event("shutdown")
async def shutdown_event():
    global camera
    if camera is not None:
        camera.release()
        
    
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)