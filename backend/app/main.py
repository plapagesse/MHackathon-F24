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


async def websocket_receiver(
    websocket: WebSocket, lobby_id: str, user_id: str, is_game_start: asyncio.Event
):
    channel = f"channel:{lobby_id}"
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "start_game_initiated":
                # Set the event to signal that the game is starting
                is_game_start.set()
                # Broadcast to all other players that the game is starting
                await conn.publish(
                    channel, json.dumps({"type": "start_game", "initiatedByHost": True})
                )
                return

            elif message["type"] == "transitioning_to_game":
                # Set the event indicating the user is intentionally transitioning to the game
                is_game_start.set()
                return

            elif message["type"] == "chat_message":
                # Broadcast the chat message to all players in the lobby
                player_name = message.get("playerName")
                chat_message = message.get("message")
                user_id = message.get("user_id")

                await conn.publish(
                    channel,
                    json.dumps(
                        {
                            "type": "chat_message",
                            "playerName": player_name,
                            "message": chat_message,
                            "user_id": user_id,
                        }
                    ),
                )

            # Handle other messages if needed, such as player heartbeats, etc.

    except WebSocketDisconnect:
        # Check if the disconnect was not a start game event
        if not is_game_start.is_set():
            player_name = await conn.hget(f"lobby:{lobby_id}:players", user_id)
            await conn.publish(
                f"channel:{lobby_id}",
                json.dumps({"type": "player_left", "playerName": player_name}),
            )


@app.websocket("/ws/{lobby_id}")
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

    # Create Pub/Sub connection and subscribe to the lobby channel
    pubsub_conn = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = pubsub_conn.pubsub()
    await pubsub.subscribe(f"channel:{lobby_id}")

    # Create an asyncio Event to track if the game is starting
    is_game_start = asyncio.Event()

    async def send_messages():
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    receive_task = asyncio.create_task(
        websocket_receiver(websocket, lobby_id, user_id, is_game_start)
    )
    send_task = asyncio.create_task(send_messages())

    done, pending = await asyncio.wait(
        [receive_task, send_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    for task in pending:
        task.cancel()

    # If the game is starting, add a small delay to ensure smooth transition
    if is_game_start.is_set():
        await asyncio.sleep(2)  # 2-second delay to allow for game transition

    # Clean up on disconnect
    await pubsub.unsubscribe(f"channel:{lobby_id}")
    await pubsub.close()
    await pubsub_conn.close()

    # Only remove from participants if the user was not transitioning to the game
    if not is_game_start.is_set():
        await conn.srem(f"{lobby_key}:participants", user_id)
