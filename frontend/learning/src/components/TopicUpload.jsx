// src/components/TopicUpload.jsx
import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      <h2>Start a New Lobby</h2>
      <input
        type="text"
        placeholder="Enter Game Topic"
        value={topic}
        onChange={handleTopicChange}
        style={{ marginRight: "10px" }}
      />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Creating Lobby..." : "Start Lobby"}
      </button>
    </div>
  );
};

export default TopicUpload;
