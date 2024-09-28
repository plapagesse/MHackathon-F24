import React, { useState } from "react";

const TopicUpload = ({ setTopic }) => {
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFocusChange = (e) => {
    setFocus(e.target.value);
  };

  const handleUpload = async () => {
    setLoading(true);

    try {
      setTopic(focus);
    } catch (error) {
      console.error(error);
      alert("Error uploading file or generating study questions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter Game focus"
        value={focus}
        onChange={handleFocusChange}
        style={{ marginLeft: "10px" }}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginLeft: "10px" }}
      >
        {loading ? "Processing..." : "Start Lobby"}
      </button>
    </div>
  );
};

export default TopicUpload;
