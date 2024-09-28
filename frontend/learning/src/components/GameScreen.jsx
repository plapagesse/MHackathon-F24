// src/components/GameScreen.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";

const GameScreen = ({ players, onGameEnd }) => {
  const [timeLeft, setTimeLeft] = useState(60); // Assuming 60 seconds for now
  const [paragraphs, setParagraphs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  
  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onGameEnd(); // End game when time runs out
    }
  }, [timeLeft, onGameEnd]);

  // Fetch paragraphs from API when the game starts
  useEffect(() => {
    const fetchParagraphs = async () => {
      try {
        const response = await axios.get("/api/get-paragraphs"); // Change the endpoint as needed
        setParagraphs(response.data.paragraphs); // Assume the API returns a 'paragraphs' array
      } catch (error) {
        console.error("Error fetching paragraphs:", error);
      }
    };
    fetchParagraphs();
  }, []);

  // Handle sending a message
  const sendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      setChatMessages([...chatMessages, { player: "You", message: currentMessage }]);
      setCurrentMessage(""); // Clear input after sending
    }
  };

  return (
    <div className="game-screen">
      {/* Time Bar */}
      <div className="time-bar">
        <div className="time-remaining" style={{ width: `${timeLeft}%` }}></div>
      </div>

      {/* Player Scores */}
      <div className="player-scores">
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.name}: {player.score}
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
            <p key={index}><strong>{msg.player}:</strong> {msg.message}</p>
          ))}
        </div>
        <form onSubmit={sendMessage}>
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
  );
};

export default GameScreen;
