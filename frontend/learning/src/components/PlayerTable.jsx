// src/components/PlayerTable.jsx
import axios from "axios";
import { useEffect, useState } from "react";

function PlayerTable(players, setPlayers, onStartGame) {
  const [isHost, setIsHost] = useState(true); // Assume the host for now, but this could be dynamic
  const [playerName, setPlayerName] = useState(""); // Store the current player's name
  const [nameEntered, setNameEntered] = useState(false); // Track if a player has entered their name
  const [joinCode, setJoinCode] = useState(""); // The game join code
  const [inputJoinCode, setInputJoinCode] = useState(""); // Input for the join code
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game

  // If host, generate the join code
  useEffect(() => {
    if (isHost) {
      // Use axios to fetch the lobby join code
      const createLobby = async () => {
        try {
          const response = await axios.post("/api/create-lobby");
          console.log("creating code")
          setJoinCode(response.data.lobby_id); // Use the returned lobby_id as the join code
        } catch (error) {
          console.error("Error creating lobby:", error);
        }
      };

      createLobby();
    }
  }, [isHost]);

  const handleJoin = () => {
    if (inputJoinCode === joinCode) {
      setHasJoined(true);
    }
  };

  const addPlayer = (name) => {
    if (!name.trim() || players.includes(name)) return;

    const prevPlayers = players;
    setPlayers((prevPlayers) => [...prevPlayers, name]);
    setNameEntered(true); // Disable the input and button after the player enters their name
  };

  const startGame = () => {
    if (isHost) {
      console.log("Game started!");
      onStartGame();
      // Add logic to start the game here
    }
  };

  console.log(players);
  return (
    <div>
      {/* Display join code for host and other joined players */}
      {isHost && <h2>Join Code: {joinCode}</h2>}

      <h2>Players</h2>
      <ul>
        {console.log(players)}
        {players.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>

      {/* If the player has not joined yet, show join code input */}
      {!hasJoined && !isHost && (
        <div>
          <input
            type="text"
            placeholder="Enter join code"
            value={inputJoinCode}
            onChange={(e) => setInputJoinCode(e.target.value)}
          />
          <button onClick={handleJoin}>Join Game</button>
        </div>
      )}

      {/* If the player has joined or is the host, allow username input */}
      {(hasJoined || isHost) && !nameEntered && (
        <div>
          <input
            type="text"
            placeholder="Enter your username"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={() => addPlayer(playerName)}>Submit</button>
        </div>
      )}

      {/* Host can start the game */}
      {isHost && (
        <button onClick={startGame} style={{ marginTop: "20px" }}>
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerTable;
