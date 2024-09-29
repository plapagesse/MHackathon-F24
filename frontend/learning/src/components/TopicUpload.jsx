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
