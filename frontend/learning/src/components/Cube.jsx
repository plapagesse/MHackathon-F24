// src/components/Cube.jsx
import React from 'react';
import '../App.css'; // Ensure Cube.css has cube styles

const Cube = ({ isSmall }) => {
  return (
    <div className={isSmall ? 'small-cube' : 'cube'}>
      <div className={isSmall ? 'small-cubeFace face1' : 'cubeFace face1'}>AIllusion</div>
      <div className={isSmall ? 'small-cubeFace face2' : 'cubeFace face2'}>AIllusion</div>
      <div className={isSmall ? 'small-cubeFace face3' : 'cubeFace face3'}>AIllusion</div>
      <div className={isSmall ? 'small-cubeFace face4' : 'cubeFace face4'}>AIllusion</div>
      <div className={isSmall ? 'small-cubeFace face5' : 'cubeFace face5'}>AIllusion</div>
      <div className={isSmall ? 'small-cubeFace face6' : 'cubeFace face6'}>AIllusion</div>
    </div>
  );
};

export default Cube;
