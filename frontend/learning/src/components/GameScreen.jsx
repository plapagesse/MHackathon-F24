// src/components/GameScreen.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useWebSocket from "../hooks/useWebSocket";
import instance from "../network/api";
import Cube from "./Cube";
import "./GameScreen.css";

const GameScreen = () => {
  const { lobbyId } = useParams(); // Get lobbyId from URL parameters
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0); // Timer for each subtopic
  const [currentSubtopicIndex, setCurrentSubtopicIndex] = useState(-1); // Index of current subtopic
  const [roundData, setRoundData] = useState(null); // Data for the entire round
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true); // Track if round is generating
  const [scores, setScores] = useState({}); // Player scores
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false); // Track if player guessed correctly
  const [correctGuessCount, setCorrectGuessCount] = useState(0); // Track how many players have guessed correctly

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

    // Determine if the player is the host
    instance
      .get(`/lobby/${lobbyId}`)
      .then((response) => {
        if (response.data.creator_id === storedUserId) {
          console.log("We are host - call startRound()");
          setIsHost(true);
          // If the player is the host, kick off round generation immediately
          startRound();
        }
      })
      .catch(() => {
        alert("Failed to load lobby details.");
        navigate("/");
      });
  }, [lobbyId, navigate]);

  // Fetch initial list of players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const participantsResponse = await instance.get(
          `/lobby/${lobbyId}/participants`
        );
        setPlayers(participantsResponse.data.players);
        // Initialize scores to zero for each player
        const initialScores = {};
        participantsResponse.data.players.forEach((player) => {
          initialScores[player] = 0;
        });
        setScores(initialScores);
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };
    fetchPlayers();
  }, [lobbyId]);

  // Host starts the round by requesting round data generation
  const startRound = async () => {
    try {
      console.log("Starting round generation...");
      setIsGenerating(true); // Set loading state

      // Make an HTTP request to initiate the round generation
      await instance.post(`/rounds/start`, null, {
        params: { lobby_id: lobbyId },
      });

      // Since the response is immediate, we wait for the "round_data_ready" event from WebSocket
      console.log("Round generation started. Waiting for results...");
    } catch (error) {
      console.error("Error starting the round:", error);
    }
  };

  // Timer effect for each subtopic
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentSubtopicIndex >= 0) {
      // End of subtopic, advance to the next one
      handleEndOfSubtopic();
    }
  }, [timeLeft, currentSubtopicIndex]);

  const handleIncomingMessage = useCallback(
    (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.type) {
          case "round_data_ready":
            setRoundData(parsedMessage.roundData);
            setCurrentSubtopicIndex(0);
            setTimeLeft(60); // Start countdown for the first subtopic
            setHasGuessedCorrectly(false); // Reset correct guess state for each player
            setCorrectGuessCount(0); // Reset correct guess count for the new round
            setIsGenerating(false); // Stop loading
            break;
          case "round_error":
            console.error("Error generating round:", parsedMessage.message);
            break;
          case "wrong_guess":
            setChatMessages((prevMessages) => [
              ...prevMessages,
              {
                player: parsedMessage.playerName,
                message: parsedMessage.message,
              },
            ]);
            break;
          case "correct_guess":
            // Update score and notify players that someone got it right
            setScores((prevScores) => ({
              ...prevScores,
              [parsedMessage.playerName]:
                prevScores[parsedMessage.playerName] + timeLeft,
            }));
            setChatMessages((prevMessages) => [
              ...prevMessages,
              {
                player: "System",
                message: `${parsedMessage.playerName} got the answer!`,
              },
            ]);

            if (parsedMessage.playerName === playerName) {
              setHasGuessedCorrectly(true); // Set that the current player guessed correctly
            }

            // Update correct guess count
            setCorrectGuessCount((prevCount) => {
              const newCount = prevCount + 1;

              // If everyone has guessed correctly, set the timer to zero
              if (newCount === players.length) {
                setTimeLeft(0);
              }

              return newCount;
            });
            break;
          case "lobby_closed":
            alert(
              parsedMessage.message || "The lobby has been closed by the host."
            );
            navigate("/");
            break;
          default:
            console.warn("Unhandled message type:", parsedMessage.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [userId, navigate, timeLeft, playerName, players.length]
  );

  const sendMessage = useWebSocket(lobbyId, userId, handleIncomingMessage);

  const handleEndOfSubtopic = () => {
    if (currentSubtopicIndex + 1 < roundData.subtopics.length) {
      // Advance to the next subtopic
      setCurrentSubtopicIndex(currentSubtopicIndex + 1);
      setTimeLeft(60); // Restart timer for the next subtopic
      setChatMessages([]); // Clear chat for the new round
      setHasGuessedCorrectly(false); // Reset correct guess state for the new subtopic
      setCorrectGuessCount(0); // Reset correct guess count for the new subtopic
    } else {
      // End of the game
      onGameEnd();
    }
  };

  const onGameEnd = () => {
    setTimeLeft(0);
    alert("The game has ended! Check out the final scores.");
    localStorage.removeItem("user_id");
    localStorage.removeItem("lobby_id");
    localStorage.removeItem("player_name");
    navigate("/");
  };

  // Handle sending a chat message (player's guess)
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (currentMessage.trim() && !hasGuessedCorrectly) {
      const messageData = {
        message: currentMessage,
        user_id: userId,
        playerName: playerName,
        subtopicIndex: currentSubtopicIndex,
      };

      try {
        // Send the answer to the backend for validation
        await instance.post(`/submit-answer`, messageData, {
          params: { lobby_id: lobbyId },
        });
      } catch (error) {
        console.error("Error submitting the answer:", error);
      }

      // Clear input after submitting
      setCurrentMessage("");
    }
  };

  return (
    <div className="game-screen">
      {isGenerating ? (
        <div className="loading-container">
          <Cube isSmall={false} />
          <p>Generating questions...</p>
        </div>
      ) : (
        <>
          <Cube isSmall={true} />
          {/* Time Bar */}
          <div className="time-bar">
            <div
              className="time-remaining"
              style={{
                width: `${(timeLeft / 60) * 100}%`,
                backgroundColor:
                  timeLeft > 40
                    ? "green"
                    : timeLeft > 20
                    ? "orange"
                    : timeLeft > 10
                    ? "yellow"
                    : "red",
              }}
            ></div>
          </div>

          {/* Player Scores */}
          <div className="player-scores">
            <h3>Players</h3>
            <ul>
              {players.map((player, index) => (
                <li key={index}>
                  {player} : {scores[player] || 0}
                </li>
              ))}
            </ul>
          </div>

          {/* Narrative Section */}
          <div className="paragraphs-container">
            {roundData && currentSubtopicIndex >= 0 && (
              <p className="paragraph-chunk">
                {roundData.subtopics[currentSubtopicIndex].narrative}
              </p>
            )}
          </div>

          {/* Chat Box */}
          <div className="chat-box">
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <p
                  key={index}
                  style={{
                    color: msg.message.includes("got the answer!")
                      ? "green"
                      : msg.player === playerName && !hasGuessedCorrectly
                      ? "red"
                      : "black",
                    fontWeight: msg.message.includes("got the answer!")
                      ? "bold"
                      : "normal",
                  }}
                >
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
                disabled={timeLeft <= 0 || hasGuessedCorrectly}
              />
              <button
                type="submit"
                disabled={timeLeft <= 0 || hasGuessedCorrectly}
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default GameScreen;
