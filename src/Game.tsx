import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Import the game logic from main.js
import './main.js';

const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Append the game container to the DOM
      const gameContainer = document.createElement('div');
      gameContainer.id = 'game-container';
      containerRef.current.appendChild(gameContainer);

      // Initialize the game
      (window as any).init();

      // Cleanup on unmount
      return () => {
        if (containerRef.current) {
          containerRef.current.removeChild(gameContainer);
        }
      };
    }
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Game; 