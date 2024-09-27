import React, { useState } from "react";
import axios from "axios";

const FileUpload = ({ setStudyQuestions }) => {
  const [file, setFile] = useState(null);
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFocusChange = (e) => {
    setFocus(e.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (focus.trim() !== "") {
      formData.append("focus", focus.trim());
    }

    try {
      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(response.data.study_questions);
      setStudyQuestions(response.data.study_questions);
    } catch (error) {
      console.error(error);
      alert("Error uploading file or generating study questions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
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
