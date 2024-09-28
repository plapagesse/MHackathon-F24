// src/components/Scoreboard.jsx
import React from 'react';

const Scoreboard = ({ players, onRestart }) => {
  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

console.log(players)
  return (
    <div className="scoreboard-container">
      <h1>Game Over! Final Scores</h1>
      <ul>
          {players.map((player, index) => (
            <li key={index}>{index + 1}.{player} {0} points</li>
            
          ))}
        </ul>
      <button onClick={onRestart}>Play Again</button>
    </div>
  );
};

export default Scoreboard;
