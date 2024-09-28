import asyncio
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor

import redis.asyncio as redis
from app.schemas import StudyQuestionResponse
from app.utils import process_document
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configuration via environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# Initialize Redis connection on startup
conn = None


@app.on_event("startup")
async def startup_event():
    global conn
    conn = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


@app.on_event("shutdown")
async def shutdown_event():
    await conn.close()


# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Dynamically loaded from environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOBBY_ID_REGEX = re.compile(r"^[a-f0-9]{32}$")

# Thread pool for blocking operations
executor = ThreadPoolExecutor()


@app.post("/upload", response_model=StudyQuestionResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    content = await file.read()

    # Offload blocking processing to thread pool
    loop = asyncio.get_event_loop()
    generated_content = await loop.run_in_executor(
        executor, process_document, content, file.filename, "narrative"
    )
    print(generated_content)
    return StudyQuestionResponse(study_narrative=generated_content)


@app.post("/create-lobby")
async def create_lobby():
    lobby_id = uuid.uuid4().hex
    creator_id = uuid.uuid4().hex  # Generate a unique creator ID

    # Store lobby information with the actual creator ID
    await conn.hset(f"lobby:{lobby_id}", mapping={"creator": creator_id})
    await conn.sadd(f"lobby:{lobby_id}:participants", creator_id)

    return {"lobby_id": lobby_id, "creator_id": creator_id}


async def websocket_receiver(websocket: WebSocket, lobby_id: str, user_id: str):
    channel = f"channel:{lobby_id}"
    try:
        while True:
            data = await websocket.receive_text()
            # Handle heartbeat
            if data == '{"type": "ping"}':
                continue
            # Broadcast message to lobby
            await conn.publish(channel, data)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error in websocket_receiver: {e}")


@app.websocket("/ws/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    # Extract 'user_id' from query parameters
    user_id = websocket.query_params.get("user_id")
    if not user_id:
        await websocket.close(code=1008, reason="Missing user_id")
        return

    # Validate lobby_id format
    if not LOBBY_ID_REGEX.match(lobby_id):
        await websocket.close(code=1008, reason="Invalid lobby ID format")
        return

    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        await websocket.close(code=1008, reason="Lobby does not exist")
        return

    await websocket.accept()

    # Add user to the lobby
    await conn.sadd(f"{lobby_key}:participants", user_id)

    try:
        # Create a separate connection for Pub/Sub
        pubsub_conn = redis.Redis(
            host=REDIS_HOST, port=REDIS_PORT, decode_responses=True
        )
        pubsub = pubsub_conn.pubsub()
        await pubsub.subscribe(f"channel:{lobby_id}")

        async def send_messages():
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])

        receive_task = asyncio.create_task(
            websocket_receiver(websocket, lobby_id, user_id)
        )
        send_task = asyncio.create_task(send_messages())

        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        pass
    finally:
        # Remove user from the lobby
        await conn.srem(f"{lobby_key}:participants", user_id)
        await pubsub.unsubscribe(f"channel:{lobby_id}")
        await pubsub.close()
        await pubsub_conn.close()

        # Check if the user leaving is the creator
        creator_id = await conn.hget(lobby_key, "creator")
        if creator_id == user_id:
            # Close lobby and notify participants
            await conn.delete(lobby_key)
            await conn.publish(f"channel:{lobby_id}", "Lobby has ended")
            # Optionally, remove all participants
            await conn.delete(f"{lobby_key}:participants")
