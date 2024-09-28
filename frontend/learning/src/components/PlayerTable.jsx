import React, { useState, useEffect } from "react";

const PlayerTable = () => {
  const [players, setPlayers] = useState([]);

  // This simulates new players joining the game
  useEffect(() => {
    const interval = setInterval(() => {
      const newPlayer = `Player ${players.length + 1}`;
      setPlayers((prevPlayers) => [...prevPlayers, newPlayer]);
    }, 2000); // A new player joins every 2 seconds

    return () => clearInterval(interval); // Clean up interval on component unmount
  }, [players]);

  return (
    <div>
      <h2>Players in the Game</h2>
      <table border="1">
        <thead>
          <tr>
            <th>#</th>
            <th>Player Name</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{player}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerTable;
