// src/components/TopicUpload.jsx
import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cube from "./Cube";

const TopicUpload = () => {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTopicChange = (e) => {
    setTopic(e.target.value);
  };

  const handleUpload = async () => {
    if (!topic.trim()) {
      alert("Please enter a valid topic.");
      return;
    }

    setLoading(true);

    try {
      // Create a lobby with the provided topic
      const response = await axios.post("/api/create-lobby", { topic });

      const { lobby_id, creator_id } = response.data;

      // Store user information (creator_id) in localStorage for identification
      localStorage.setItem("user_id", creator_id);
      localStorage.setItem("lobby_id", lobby_id);

      // Navigate to PlayerTable with the lobbyId
      navigate(`/playertable/${lobby_id}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      alert("Failed to create lobby. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <span className="info-text"><marquee width="700"
  height="200" >Can you see through the AI’s tricks? Test your intuition in Ailusion! Not everything is as it seems. Guess the AI's bluff and rise to the top! Is it fact or fiction? In Ailusion, your wits are the only thing standing between truth and deception. The AI is ready to deceive you. Can you call its bluff in time? Challenge your mind and spot the AI-generated lies in this thrilling game of deception! Blurring the lines between truth and illusion. Welcome to Ailusion—where only the sharpest players thrive! Ailusion: The game where AI challenges your perception of reality. Are you ready? Don’t let the AI fool you! Sharpen your skills and guess what’s real.</marquee> </span>

      <div className="lobby-cube"> <Cube isSmall={false} /> {}</div>
      <h2>Start a New Lobby</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
  <input
    type="text"
    placeholder="Enter Game Topic"
    value={topic}
    onChange={handleTopicChange}
    style={{ marginRight: "10px" }}
  />
  <button type="submit" disabled={loading}>
    {loading ? "Creating Lobby..." : "Start Lobby"}
  </button>
</form>
    </div>
  );
};

export default TopicUpload;
