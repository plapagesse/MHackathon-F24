import React, { useState } from "react";
import axios from "axios";

const FileUpload = ({ setStudyQuestions }) => {
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFocusChange = (e) => {
    setFocus(e.target.value);
  };

  const handleUpload = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("focus", focus);

    try {
      // const response = await axios.post("/api/upload", formData, {
      //   headers: { "Content-Type": "multipart/form-data" },
      // });
      // console.log(response.data.study_questions);
      const myMap = new Map();
      myMap.set("focus", focus);
      setStudyQuestions(myMap);
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
        placeholder="Enter focus (optional)"
        value={focus}
        onChange={handleFocusChange}
        style={{ marginLeft: "10px" }}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginLeft: "10px" }}
      >
        {loading ? "Processing..." : "Upload and Generate Study Questions"}
      </button>
    </div>
  );
};

export default FileUpload;
