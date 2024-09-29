// src/App.jsx
import { useState } from "react";
import "./App.css";
import GameScreen from "./components/GameScreen";
import PlayerTable from "./components/PlayerTable";
import Scoreboard from "./components/ScoreBoard";
import TopicUpload from "./components/TopicUpload";


function App() {
  const [topic, setTopic] = useState("");
  const [players, setPlayers] = useState(["foo"]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [shrinkCube, setShrinkCube] = useState(false);

  const handleDiscard = () => {
    setStudyQuestions([]);
  };

  const handleStartGame = () => {
    setIsGameStarted(true);
    setShrinkCube(true);
  };

  const handleGameEnd = () => {
    alert("Game over!");
    setIsGameStarted(false);
    setIsGameOver(true);
    setShrinkCube(false);
  };

  

  const handleRestartGame = () => {
    setIsGameOver(true);
    setPlayers([]);
    setTopic("");
  };
  
  return (
    <div className="App">
      <header className="App-header">
      {!shrinkCube ? (
          <div className="cube">
            <div className="cubeFace face1">AIllusion</div>
            <div className="cubeFace face2">AIllusion</div>
            <div className="cubeFace face3">AIllusion</div>
            <div className="cubeFace face4">AIllusion</div>
            <div className="cubeFace face5">AIllusion</div>
            <div className="cubeFace face6">AIllusion</div>
          </div>
        ) : (
          <div className="small-cube">
            <div className="small-cubeFace face1">AIllusion</div>
            <div className="small-cubeFace face2">AIllusion</div>
            <div className="small-cubeFace face3">AIllusion</div>
            <div className="small-cubeFace face4">AIllusion</div>
            <div className="small-cubeFace face5">AIllusion</div>
            <div className="small-cubeFace face6">AIllusion</div>
          </div>
        )}
        
      </header>
      <main>
        {isGameOver ? (
          <Scoreboard players={players} onRestart={handleRestartGame} />
        ) : !isGameStarted ? (
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
