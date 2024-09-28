// src/components/PlayerTable.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useWebSocket from "../hooks/useWebSocket";

function PlayerTable() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const userId = localStorage.getItem("user_id");

  useEffect(() => {
    // Function to check if the current user is the host and fetch current players
    const checkHostAndFetchPlayers = async () => {
      try {
        // Fetch lobby details to verify if user is the host
        const response = await axios.get(`/api/lobby/${lobbyId}`);
        const { creator_id, topic } = response.data;
        if (creator_id === userId) {
          setIsHost(true);
        }

        // Fetch the current list of players
        const participantsResponse = await axios.get(`/api/lobby/${lobbyId}/participants`);
        setPlayers(participantsResponse.data.players);
      } catch (error) {
        console.error("Error fetching lobby details:", error);
        alert("Failed to fetch lobby details. Please ensure the lobby exists.");
      }
    };

    checkHostAndFetchPlayers();

    // Generate the invite link
    const currentLink = `${window.location.origin}/playertable/${lobbyId}`;
    setInviteLink(currentLink);
  }, [lobbyId, userId]);

  // WebSocket message handler
  const handleIncomingMessage = (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      switch (parsedMessage.type) {
        case "player_joined":
          setPlayers((prevPlayers) => {
            // Prevent duplicate entries
            if (!prevPlayers.includes(parsedMessage.playerName)) {
              return [...prevPlayers, parsedMessage.playerName];
            }
            return prevPlayers;
          });
          break;
        case "player_left":
          setPlayers((prevPlayers) =>
            prevPlayers.filter((player) => player !== parsedMessage.playerName)
          );
          break;
        case "start_game":
          // Navigate to GameScreen when the game starts
          navigate(`/game/${lobbyId}`);
          break;
        case "lobby_closed":
          alert(parsedMessage.message || "Lobby has been closed by the host.");
          navigate("/"); // Redirect to landing page
          break;
        default:
          console.warn("Unhandled message type:", parsedMessage.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  // Initialize WebSocket connection
  const sendMessage = useWebSocket(lobbyId, userId, handleIncomingMessage);

  const handleJoinLobby = async () => {
    if (!playerName.trim()) {
      alert("Please enter a valid username.");
      return;
    }

    try {
      // Send a join request to the backend
      await axios.post(`/api/lobby/${lobbyId}/join`, {
        user_id: userId,
        player_name: playerName,
      });

      // Do NOT add the player locally here to avoid duplication
      // The WebSocket message will handle updating the players list

      setNameEntered(true);
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert("Failed to join lobby. Please ensure the lobby ID is correct.");
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;

    try {
      // Send a request to start the game
      await axios.post(`/api/lobby/${lobbyId}/start`, { user_id: userId });

      // The 'start_game' message will be received via WebSocket, triggering navigation
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Failed to start the game. Please try again.");
    }
  };

  return (
    <div>
      {/* Display invite link for host */}
      {isHost && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Invite Link:</h3>
          <a href={inviteLink}>{inviteLink}</a>
          <p>Share this link with your friends to join the lobby.</p>
        </div>
      )}

      <h2>Players in Lobby</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>

      {/* If the player has not joined yet and is not the host, show username input */}
      {!isHost && !nameEntered && (
        <div>
          <input
            type="text"
            placeholder="Enter your username"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={handleJoinLobby}>Join Lobby</button>
        </div>
      )}

      {/* If the host hasn't entered a username yet, allow them to set one */}
      {isHost && !nameEntered && (
        <div>
          <input
            type="text"
            placeholder="Enter your username (optional)"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button
            onClick={() => {
              if (playerName.trim()) {
                setPlayers((prevPlayers) => [...prevPlayers, playerName]);
                setNameEntered(true);
              }
            }}
          >
            Submit
          </button>
        </div>
      )}

      {/* Host can start the game */}
      {isHost && (
        <button onClick={handleStartGame} style={{ marginTop: "20px" }}>
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerTable;
