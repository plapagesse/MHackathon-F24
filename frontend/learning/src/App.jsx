// src/App.jsx
import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import GameScreen from "./components/GameScreen";
import PlayerTable from "./components/PlayerTable";
import TopicUpload from "./components/TopicUpload";

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Ailusion</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<TopicUpload />} />
            <Route path="/playertable/:lobbyId" element={<PlayerTable />} />
            <Route path="/game/:lobbyId" element={<GameScreen />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
