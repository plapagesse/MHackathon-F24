// src/App.jsx
import { useState } from "react";
import "./App.css";
import GameScreen from "./components/GameScreen";
import PlayerTable from "./components/PlayerTable";
import TopicUpload from "./components/TopicUpload";

function App() {
  const [topic, setTopic] = useState("");
  const [players, setPlayers] = useState(["foo"]);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleDiscard = () => {
    setStudyQuestions([]);
  };

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  const handleGameEnd = () => {
    alert("Game over!");
    setIsGameStarted(false); // Reset the game
    setPlayers([]); // Clear players after game ends (optional, depending on flow)
    setTopic(""); // Reset the topic for a new game
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Ailusion</h1>
      </header>
      <main>
        {!isGameStarted ? (
          topic === "" ? (
            <TopicUpload setTopic={setTopic} />
          ) : (
            <PlayerTable players={players} setPlayers={setPlayers} onStartGame={handleStartGame} />
          )
        ) : (
          <GameScreen players={players} onGameEnd={handleGameEnd} />
        )}
      </main>
    </div>
  );
}

export default App;
