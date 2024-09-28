# backend/main.py
import asyncio
import json
import os
import re
import uuid

import redis.asyncio as redis
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Configuration via environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

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


class CreateLobbyRequest(BaseModel):
    topic: str


class CreateLobbyResponse(BaseModel):
    lobby_id: str
    creator_id: str


class JoinLobbyRequest(BaseModel):
    user_id: str
    player_name: str


class ChatMessage(BaseModel):
    type: str
    playerName: str
    message: str


@app.post("/create-lobby", response_model=CreateLobbyResponse)
async def create_lobby(request: CreateLobbyRequest):
    lobby_id = uuid.uuid4().hex
    creator_id = uuid.uuid4().hex  # Generate a unique creator ID
    topic = request.topic

    # Store lobby information with the actual creator ID and topic
    await conn.hset(
        f"lobby:{lobby_id}", mapping={"creator": creator_id, "topic": topic}
    )
    await conn.sadd(f"lobby:{lobby_id}:participants", creator_id)
    await conn.hset(
        f"lobby:{lobby_id}:players", creator_id, "Host"
    )  # Name the host as "Host"

    return CreateLobbyResponse(lobby_id=lobby_id, creator_id=creator_id)


@app.get("/lobby/{lobby_id}", response_model=dict)
async def get_lobby(lobby_id: str):
    if not LOBBY_ID_REGEX.match(lobby_id):
        raise HTTPException(status_code=400, detail="Invalid lobby ID format")

    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    creator_id = await conn.hget(lobby_key, "creator")
    topic = await conn.hget(lobby_key, "topic")

    return {"creator_id": creator_id, "topic": topic}


@app.get("/lobby/{lobby_id}/participants", response_model=dict)
async def get_participants(lobby_id: str):
    lobby_key = f"lobby:{lobby_id}:participants"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    participants = await conn.smembers(lobby_key)
    players = []
    for user_id in participants:
        player_name = await conn.hget(f"lobby:{lobby_id}:players", user_id)
        players.append(player_name if player_name else "Unknown Player")

    return {"players": players}


@app.post("/lobby/{lobby_id}/join")
async def join_lobby(lobby_id: str, request: JoinLobbyRequest):
    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    # Add the player to the participants set
    await conn.sadd(f"{lobby_key}:participants", request.user_id)

    # Store player_name mapping
    await conn.hset(f"{lobby_key}:players", request.user_id, request.player_name)

    # Notify via Pub/Sub that a new player has joined
    await conn.publish(
        f"channel:{lobby_id}",
        json.dumps({"type": "player_joined", "playerName": request.player_name}),
    )

    return {"detail": "Joined the lobby successfully"}


@app.post("/lobby/{lobby_id}/start")
async def start_game(lobby_id: str, request: JoinLobbyRequest):
    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    creator_id = await conn.hget(lobby_key, "creator")
    if creator_id != request.user_id:
        raise HTTPException(status_code=403, detail="Only the host can start the game")

    # Notify all participants via Pub/Sub to start the game
    await conn.publish(f"channel:{lobby_id}", json.dumps({"type": "start_game"}))

    return {"detail": "Game started successfully"}


@app.get("/lobby/{lobby_id}/paragraphs")
async def get_paragraphs(lobby_id: str):
    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    topic = await conn.hget(lobby_key, "topic")

    # Generate dummy paragraphs based on the topic
    paragraphs = [
        f"Paragraph 1 about {topic}.",
        f"Paragraph 2 about {topic}.",
        f"Paragraph 3 about {topic}.",
    ]

    return {"paragraphs": paragraphs}


@app.post("/lobby/{lobby_id}/chat")
async def chat(lobby_id: str, message: ChatMessage):
    lobby_key = f"lobby:{lobby_id}"
    if not await conn.exists(lobby_key):
        raise HTTPException(status_code=404, detail="Lobby does not exist")

    # Broadcast the chat message to all participants via Pub/Sub
    await conn.publish(
        f"channel:{lobby_id}",
        json.dumps(
            {
                "type": "chat_message",
                "playerName": message.playerName,
                "message": message.message,
            }
        ),
    )

    return {"detail": "Message sent"}


async def websocket_receiver(websocket: WebSocket, lobby_id: str, user_id: str):
    channel = f"channel:{lobby_id}"
    try:
        while True:
            data = await websocket.receive_text()
            # Handle heartbeat or other message types if needed
            # For this implementation, we rely on the backend to handle messages
            pass
    except WebSocketDisconnect:
        # Optionally, notify others that the player has left
        player_name = await conn.hget(f"lobby:{lobby_id}:players", user_id)
        await conn.publish(
            f"channel:{lobby_id}",
            json.dumps(
                {
                    "type": "player_left",
                    "playerName": player_name if player_name else "Unknown Player",
                }
            ),
        )
    except Exception as e:
        print(f"Error in websocket_receiver: {e}")


@app.websocket("/lobby/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    await websocket.accept()

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

    # Add user to the lobby's participants set
    await conn.sadd(f"{lobby_key}:participants", user_id)

    try:
        # Create a separate Pub/Sub connection for subscribing
        pubsub_conn = redis.Redis(
            host=REDIS_HOST, port=REDIS_PORT, decode_responses=True
        )
        pubsub = pubsub_conn.pubsub()
        await pubsub.subscribe(f"channel:{lobby_id}")

        async def send_messages():
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Ensure that the message is a JSON string
                    if isinstance(message["data"], str):
                        await websocket.send_text(message["data"])
                    else:
                        # Serialize to JSON if it's a dictionary or other type
                        await websocket.send_text(json.dumps(message["data"]))

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
            await conn.publish(
                f"channel:{lobby_id}",
                json.dumps(
                    {
                        "type": "lobby_closed",
                        "message": "Lobby has been closed by the host.",
                    }
                ),
            )
            # Optionally, remove all participants
            await conn.delete(f"{lobby_key}:participants")
            await conn.delete(f"{lobby_key}:players")
