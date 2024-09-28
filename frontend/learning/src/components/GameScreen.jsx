// src/components/GameScreen.jsx
import React, { useEffect, useState } from "react";
import './GameScreen.css';


const GameScreen = ({ players, onGameEnd }) => {
  const [timeLeft, setTimeLeft] = useState(20); // Assuming 60 seconds for now
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
        // const response = await axios.get("/api/get-paragraphs"); // Change the endpoint as needed
        const dummyParagraphs = [
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore."
        ];
        setParagraphs(dummyParagraphs); // Assume the API returns a 'paragraphs' array
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

  // calculate color based on time left

  const getTimeBarColor = () => {
    if (timeLeft > 15) return "green";
    if (timeLeft > 10) return "orange";
    if (timeLeft > 5) return "yellow";
    return "red";
  };


  console.log(players)
  return (
    <div className="game-screen">
    {/* Time Bar */}
    <div className="time-bar">
        <div className="time-remaining" 
        style={{
           width: `${(timeLeft / 60)*100}%`,
           backgroundColor: getTimeBarColor()
           }}></div>
    </div>

      {/* Player Scores */}
      <div className="player-scores">
        <ul>
          {players.map((player, index) => (
            <li key={index}>{player} : {0} </li>
            
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
