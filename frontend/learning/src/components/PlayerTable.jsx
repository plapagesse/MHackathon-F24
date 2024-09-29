import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import useWebSocket from "../hooks/useWebSocket";
import instance from "../network/api";

function PlayerTable() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("player_name") || ""
  );
  const [nameEntered, setNameEntered] = useState(
    Boolean(localStorage.getItem("player_name"))
  );
  const [inviteLink, setInviteLink] = useState("");
  const [userId, setUserId] = useState(localStorage.getItem("user_id") || null);
  const isGameStarting = useRef(false); // Track if the game is starting

  useEffect(() => {
    const checkHostAndFetchPlayers = async () => {
      try {
        const response = await instance.get(`/lobby/${lobbyId}`);
        const { creator_id } = response.data;

        let storedUserId = localStorage.getItem("user_id");
        if (!storedUserId) {
          storedUserId = uuidv4();
          localStorage.setItem("user_id", storedUserId);
        }
        setUserId(storedUserId);

        if (creator_id === storedUserId) {
          localStorage.setItem("player_name", "Host");
          setPlayerName("Host");
          setIsHost(true);
        }

        const participantsResponse = await instance.get(
          `/lobby/${lobbyId}/participants`
        );
        setPlayers(participantsResponse.data.players);
      } catch (error) {
        console.error("Error fetching lobby details:", error);
        alert("Failed to fetch lobby details. Please ensure the lobby exists.");
        navigate("/"); // Redirect to home screen after showing the alert
      }
    };

    checkHostAndFetchPlayers();
    const currentLink = `${window.location.origin}/playertable/${lobbyId}`;
    setInviteLink(currentLink);
  }, [lobbyId, navigate]);

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
              prevPlayers.filter(
                (player) => player !== parsedMessage.playerName
              )
            );
            break;
          case "start_game":
            isGameStarting.current = true; // Set the flag to indicate that the game is starting
            sendMessage(JSON.stringify({ type: "transitioning_to_game" })); // Notify server of transition
            navigate(`/game/${lobbyId}`);
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
    [navigate, lobbyId]
  );

  const sendMessage = useWebSocket(lobbyId, userId, handleIncomingMessage);

  const handleJoinLobby = async () => {
    if (!playerName.trim()) {
      alert("Please enter a valid username.");
      return;
    }

    try {
      await instance.post(`/lobby/${lobbyId}/join`, {
        user_id: userId,
        player_name: playerName,
      });
      setNameEntered(true);
      localStorage.setItem("player_name", playerName); // Store player name in localStorage
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleStartGame = () => {
    isGameStarting.current = true; // Set the flag to indicate that the game is starting
    sendMessage(JSON.stringify({ type: "start_game_initiated" }));
    setTimeout(() => {
      sendMessage(JSON.stringify({ type: "transitioning_to_game" })); // Notify server of transition
      navigate(`/game/${lobbyId}`);
    }, 1000); // Add a small delay for smoother transition
  };

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
