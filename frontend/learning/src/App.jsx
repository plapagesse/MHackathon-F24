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
      {/* {!shrinkCube ? (
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
        )} */}

          <div className="small-cube">
            <div className="small-cubeFace face1">AIllusion</div>
            <div className="small-cubeFace face2">AIllusion</div>
            <div className="small-cubeFace face3">AIllusion</div>
            <div className="small-cubeFace face4">AIllusion</div>
            <div className="small-cubeFace face5">AIllusion</div>
            <div className="small-cubeFace face6">AIllusion</div>
          </div>
        
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
  )
}

export default App;
