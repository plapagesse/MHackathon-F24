import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import useWebSocket from "../hooks/useWebSocket";

function PlayerTable() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const checkHostAndFetchPlayers = async () => {
      try {
        const response = await axios.get(`/api/lobby/${lobbyId}`);
        const { creator_id, topic } = response.data;

        let storedUserId = localStorage.getItem("user_id");
        if (!storedUserId) {
          storedUserId = uuidv4();
          localStorage.setItem("user_id", storedUserId);
        }
        setUserId(storedUserId);

        if (creator_id === storedUserId) {
          setIsHost(true);
        }

        const participantsResponse = await axios.get(`/api/lobby/${lobbyId}/participants`);
        setPlayers(participantsResponse.data.players);
      } catch (error) {
        console.error("Error fetching lobby details:", error);
        alert("Failed to fetch lobby details. Please ensure the lobby exists.");
      }
    };

    checkHostAndFetchPlayers();
    const currentLink = `${window.location.origin}/playertable/${lobbyId}`;
    setInviteLink(currentLink);
  }, [lobbyId]);

  const handleIncomingMessage = useCallback(
    (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.type) {
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
              prevPlayers.filter((player) => player !== parsedMessage.playerName)
            );
            break;
          case "start_game":
            navigate(`/game/${lobbyId}`);
            break;
          case "lobby_closed":
            alert(parsedMessage.message || "Lobby has been closed by the host.");
            navigate("/");
            break;
          default:
            console.warn("Unhandled message type:", parsedMessage.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [navigate, lobbyId] // Include dependencies that are used inside the function
  );

  const sendMessage = useWebSocket(lobbyId, userId, handleIncomingMessage);

  const handleJoinLobby = async () => {
    if (!playerName.trim()) {
      alert("Please enter a valid username.");
      return;
    }

    try {
      await axios.post(`/api/lobby/${lobbyId}/join`, {
        user_id: userId,
        player_name: playerName,
      });
      setNameEntered(true);
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleStartGame = () => {}

  return (
    <div>
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

      {isHost && (
        <button onClick={handleStartGame} style={{ marginTop: "20px" }}>
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerTable;
