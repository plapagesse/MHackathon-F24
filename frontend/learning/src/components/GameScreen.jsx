// src/components/GameScreen.jsx
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useWebSocket from "../hooks/useWebSocket";
import "./GameScreen.css";

const GameScreen = () => {
  const { lobbyId } = useParams(); // Get lobbyId from URL parameters
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60); // Game duration in seconds
  const [paragraphs, setParagraphs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [playerName, setPlayerName] = useState("");

  // Initialize userId and playerName from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedPlayerName = localStorage.getItem("player_name");

    if (!storedUserId || !storedPlayerName) {
      alert("User ID or Player Name not found. Please join the lobby first.");
      navigate(`/playertable/${lobbyId}`);
      return;
    }

    setUserId(storedUserId);
    setPlayerName(storedPlayerName);
  }, [lobbyId, navigate]);

  // Fetch initial list of players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const participantsResponse = await axios.get(
          `/api/lobby/${lobbyId}/participants`
        );
        setPlayers(participantsResponse.data.players);
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };
    fetchPlayers();
  }, [lobbyId]);

  // Fetch paragraphs from API when the game starts
  useEffect(() => {
    const fetchParagraphs = async () => {
      try {
        const response = await axios.get("/api/get-paragraphs"); // Update endpoint as needed
        setParagraphs(response.data.paragraphs); // Assuming API returns a 'paragraphs' array
      } catch (error) {
        console.error("Error fetching paragraphs:", error);
      }
    };
    fetchParagraphs();
  }, []);

  const onGameEnd = () => {};

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onGameEnd(); // End game when time runs out
    }
  }, [timeLeft, onGameEnd]);

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback(
    (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.type) {
          case "chat_message":
            // Prevent adding the message twice for the sender
            if (parsedMessage.user_id !== userId) {
              setChatMessages((prevMessages) => [
                ...prevMessages,
                {
                  player: parsedMessage.playerName,
                  message: parsedMessage.message,
                },
              ]);
            }
            break;
          case "player_joined":
            setPlayers((prevPlayers) => {
              if (!prevPlayers.includes(parsedMessage.playerName)) {
                return [...prevPlayers, parsedMessage.playerName];
              }
              return prevPlayers;
            });
            break;
          case "player_left":
            setPlayers((prevPlayers) =>
              prevPlayers.filter(
                (player) => player !== parsedMessage.playerName
              )
            );
            break;
          case "lobby_closed":
            alert(
              parsedMessage.message || "The lobby has been closed by the host."
            );
            navigate("/"); // Redirect all players to the home screen
            break;
          default:
            console.warn("Unhandled message type:", parsedMessage.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [userId, navigate]
  );

  // Use WebSocket hook
  const sendMessage = useWebSocket(lobbyId, userId, handleIncomingMessage);

  // Handle sending a chat message
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      // Send the message via WebSocket
      const messageData = {
        type: "chat_message",
        message: currentMessage,
        user_id: userId,
        playerName: playerName, // Include playerName
      };
      sendMessage(JSON.stringify(messageData));

      // Display your own message immediately
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { player: playerName || "You", message: currentMessage },
      ]);

      setCurrentMessage(""); // Clear input after sending
    }
  };

  // Calculate color based on time left
  const getTimeBarColor = () => {
    if (timeLeft > 40) return "green";
    if (timeLeft > 20) return "orange";
    if (timeLeft > 10) return "yellow";
    return "red";
  };

  return (
    <div>
      {/* Time Bar */}
      <div className="time-bar">
        <div
          className="time-remaining"
          style={{
            width: `${(timeLeft / 60) * 100}%`,
            backgroundColor: getTimeBarColor(),
          }}
        ></div>
      </div>

      <div className="game-screen">
        {/* Player Scores */}
        <div className="player-scores">
          <h3>Players</h3>
          <ul>
            {players.map((player, index) => (
              <li key={index}>
                {player} : {0} {/* Placeholder for score */}
              </li>
            ))}
          </ul>
        </div>

        {/* Paragraphs in the middle */}
        <div className="paragraphs-container">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="paragraph-chunk">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Chat Box */}
        <div className="chat-box">
          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <p key={index}>
                <strong>{msg.player}:</strong> {msg.message}
              </p>
            ))}
          </div>
          <form onSubmit={sendChatMessage}>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your answer..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
