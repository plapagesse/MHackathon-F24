import React, { useEffect, useState } from 'react';

const ScrollingText = () => {
  const messages = [
    "Can you see through the AI’s tricks? Test your intuition in Ailusion!",
    "Not everything is as it seems. Guess the AI's bluff and rise to the top!",
    "Is it fact or fiction? In Ailusion, your wits are the only thing standing between truth and deception.",
    "The AI is ready to deceive you. Can you call its bluff in time?",
    "Challenge your mind and spot the AI-generated lies in this thrilling game of deception!",
    "Blurring the lines between truth and illusion. Welcome to Ailusion—where only the sharpest players thrive!",
    "Ailusion: The game where AI challenges your perception of reality. Are you ready?",
    "Don’t let the AI fool you! Sharpen your skills and guess what’s real.",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 5000); // Change message every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [messages.length]);

  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <p
        style={{
          display: 'inline-block',
          paddingLeft: '100%', // Start from right off-screen
          animation: `scrollLeft 20s linear infinite`
        }}
      >
        {messages[currentMessageIndex]}
      </p>

      {/* Add keyframe animation for scrolling */}
      <style>
        {`
          @keyframes scrollLeft {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `}
      </style>
    </div>
  );
};

export default ScrollingText;
