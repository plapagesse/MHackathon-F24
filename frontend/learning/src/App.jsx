// src/App.jsx
import { useState } from "react";
import "./App.css";
import TopicUpload from "./components/TopicUpload";
import QuestionsTable from "./components/QuestionsTable";
import PlayerTable from "./components/PlayerTable";

function App() {
  const [topic, setTopic] = useState("");
  const [players, setPlayers] = useState({ done: false });

  const handleDiscard = () => {
    setStudyQuestions([]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Ailusion</h1>
      </header>
      <main>
        {topic === "" ? <TopicUpload setTopic={setTopic} /> : <PlayerTable />}
      </main>
    </div>
  );
}

export default App;
