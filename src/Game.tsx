import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Game constants
const OBSTACLE_TYPES = {
  rock: {
    geometry: new THREE.DodecahedronGeometry(1, 0),
    color: 0x808080,
    scale: 1,
    probability: 0.6
  },
  log: {
    geometry: new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
    color: 0x8B4513,
    scale: 1,
    probability: 0.4
  }
};

const FISH_TYPES = {
  normal: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFFD700,
    scale: 1,
    speed: 1,
    points: 1,
    probability: 0.4
  },
  rainbow: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFF69B4,
    scale: 1.2,
    speed: 1.2,
    points: 3,
    probability: 0.2
  },
  golden: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFFD700,
    scale: 1.3,
    speed: 1.3,
    points: 5,
    probability: 0.15
  },
  emerald: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0x00FF00,
    scale: 1.4,
    speed: 1.4,
    points: 7,
    probability: 0.1
  },
  diamond: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0x00FFFF,
    scale: 1.5,
    speed: 1.5,
    points: 10,
    probability: 0.05
  },
  clam: {
    geometry: new THREE.SphereGeometry(0.5, 16, 16),
    color: 0xFFFFFF,
    scale: 1.2,
    speed: 0.8,
    points: 15,
    probability: 0.03
  },
  seahorse: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFFA500,
    scale: 1.3,
    speed: 1.1,
    points: 8,
    probability: 0.04
  },
  jellyfish: {
    geometry: new THREE.SphereGeometry(0.5, 16, 16),
    color: 0xFF00FF,
    scale: 1.4,
    speed: 1.2,
    points: 12,
    probability: 0.02
  },
  starfish: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFFFF00,
    scale: 1.2,
    speed: 1.0,
    points: 6,
    probability: 0.01
  }
};

const defaultLeaderboard = () => {
  try {
    return JSON.parse(localStorage.getItem('otterRiverLeaderboard') || '[]');
  } catch {
    return [];
  }
};

const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Game state
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState(defaultLeaderboard());
  const [gameTime, setGameTime] = useState(0);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const otterRef = useRef<THREE.Object3D | null>(null);
  const riverRef = useRef<THREE.Object3D | null>(null);
  const obstaclesRef = useRef<THREE.Object3D[]>([]);
  const fishRef = useRef<THREE.Object3D[]>([]);
  const lastObstacleTimeRef = useRef(0);
  const lastFishTimeRef = useRef(0);
  const gameTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baseSpeedRef = useRef(0.2);
  const obstacleSpawnIntervalRef = useRef(300);
  const currentObstacleIntervalRef = useRef(300);
  const animationFrameRef = useRef<number | null>(null);

  // Movement controls
  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
  });

  // UI overlays
  const StartScreen = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: gameStarted ? 'none' : 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '3.5rem',
        marginBottom: '2rem',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
      }}>Otter River Adventure</h1>

      <div style={{
        maxWidth: '600px',
        marginBottom: '2rem',
        fontSize: '1.2rem',
        lineHeight: '1.6'
      }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>How to Play</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>🎮 Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to move</li>
          <li style={{ marginBottom: '0.5rem' }}>🎯 Collect fish and clams while avoiding obstacles</li>
          <li style={{ marginBottom: '0.5rem' }}>⚡ Game speeds up as you level up</li>
          <li style={{ marginBottom: '0.5rem' }}>✨ Rarer fish appear at higher levels</li>
        </ul>
      </div>

      <div style={{
        marginBottom: '2rem',
        fontSize: '1.2rem',
        lineHeight: '1.6'
      }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Point Distribution</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>🐟 Normal Fish: 1 point</li>
          <li style={{ marginBottom: '0.5rem' }}>🌈 Rainbow Fish: 3 points</li>
          <li style={{ marginBottom: '0.5rem' }}>🌟 Golden Fish: 5 points</li>
          <li style={{ marginBottom: '0.5rem' }}>💎 Emerald Fish: 7 points</li>
          <li style={{ marginBottom: '0.5rem' }}>💠 Diamond Fish: 10 points</li>
          <li style={{ marginBottom: '0.5rem' }}>🦪 Clam: 15 points</li>
          <li style={{ marginBottom: '0.5rem' }}>🐠 Seahorse: 8 points</li>
          <li style={{ marginBottom: '0.5rem' }}>🐙 Jellyfish: 12 points</li>
          <li style={{ marginBottom: '0.5rem' }}>⭐ Starfish: 6 points</li>
        </ul>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
      >
        Start Adventure!
      </button>
    </div>
  );

  const GameOverScreen = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: gameOver ? 'flex' : 'none',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '3.5rem',
        marginBottom: '2rem',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
      }}>Game Over!</h1>

      <p style={{
        fontSize: '2rem',
        marginBottom: '2rem',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
      }}>
        Final Score: {score}
      </p>

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.2rem',
            borderRadius: '5px',
            border: '2px solid #4CAF50',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        />
        <button
          onClick={submitScore}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.2rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
        >
          Submit Score
        </button>
      </div>

      <div style={{
        marginBottom: '2rem'
      }}>
        <h2 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
        }}>Top Scores</h2>
        {leaderboard.map((entry, index) => (
          <div key={index} style={{
            fontSize: '1.2rem',
            marginBottom: '0.5rem',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
          }}>
            {entry.name}: {entry.score}
          </div>
        ))}
      </div>

      <button
        onClick={restartGame}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
      >
        Play Again
      </button>
    </div>
  );

  const GameInfo = () => (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: '#fff',
      fontSize: '1.5rem',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
      zIndex: 100,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '1rem',
      borderRadius: '5px'
    }}>
      <div style={{ marginBottom: '0.5rem' }}>Score: {score}</div>
      <div style={{ marginBottom: '0.5rem' }}>Lives: {lives}</div>
      <div style={{ marginBottom: '0.5rem' }}>Level: {level}</div>
      <div>Time: {Math.floor(gameTime / 60)}:{Math.floor(gameTime % 60).toString().padStart(2, '0')}</div>
    </div>
  );

  // Add touch controls state
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchActive, setTouchActive] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
    sceneRef.current = scene;

    // Create camera with original settings
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    (camera as any).position.set(0, 15, 20);
    (camera as any).lookAt(0, 0, -100);
    cameraRef.current = camera;
    scene.add(camera);

    // Create renderer with original settings
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    (renderer as any).shadowMap.enabled = true;
    (renderer as any).shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Add lights with original settings
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    (directionalLight as any).position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create environment
    createEnvironment();

    // Create river
    createRiver();

    // Create otter
    createOtter();

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Add touch event listeners
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setTouchActive(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!touchActive) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      // Update key states based on touch movement
      keysRef.current.ArrowLeft = deltaX < -20;
      keysRef.current.ArrowRight = deltaX > 20;
      keysRef.current.ArrowUp = deltaY < -20;
      keysRef.current.ArrowDown = deltaY > 20;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTouchActive(false);
      // Reset all movement keys
      Object.keys(keysRef.current).forEach(key => {
        keysRef.current[key as keyof typeof keysRef.current] = false;
      });
    };

    // Add touch event listeners
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Start animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (gameStarted && !gameOver) {
        update();
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (containerRef.current) {
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
        containerRef.current.removeEventListener('touchmove', handleTouchMove);
        containerRef.current.removeEventListener('touchend', handleTouchEnd);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  const update = () => {
    if (!gameStarted || gameOver) return;

    // Move otter based on key presses
    if (!otterRef.current) return;
    const moveSpeed = 0.2;
    let moving = false;
    let targetRotation = (otterRef.current as any).rotation.y;

    if (keysRef.current.ArrowUp || keysRef.current.w) {
      (otterRef.current as any).position.z -= moveSpeed;
      targetRotation = Math.PI;
      moving = true;
    }
    if (keysRef.current.ArrowDown || keysRef.current.s) {
      (otterRef.current as any).position.z += moveSpeed;
      targetRotation = 0;
      moving = true;
    }
    if (keysRef.current.ArrowLeft || keysRef.current.a) {
      (otterRef.current as any).position.x -= moveSpeed;
      targetRotation = -Math.PI / 2;
      moving = true;
    }
    if (keysRef.current.ArrowRight || keysRef.current.d) {
      (otterRef.current as any).position.x += moveSpeed;
      targetRotation = Math.PI / 2;
      moving = true;
    }

    if (moving) {
      (otterRef.current as any).rotation.y = THREE.MathUtils.lerp((otterRef.current as any).rotation.y, targetRotation, 0.2);
    }

    // Keep otter within bounds
    (otterRef.current as any).position.x = Math.max(-20, Math.min(20, (otterRef.current as any).position.x));
    (otterRef.current as any).position.z = Math.max(-49, Math.min(49, (otterRef.current as any).position.z));

    // Calculate current speed based on level
    const currentSpeed = baseSpeedRef.current * (1 + (level - 1) * 0.15);

    // Update obstacle spawn interval based on level
    currentObstacleIntervalRef.current = Math.max(100, obstacleSpawnIntervalRef.current - (level * 20));

    // Spawn obstacles and fish
    const currentTime = Date.now();
    if (currentTime - lastObstacleTimeRef.current > currentObstacleIntervalRef.current) {
      createObstacle();
      if (Math.random() < (level * 0.1)) {
        createObstacle();
      }
      lastObstacleTimeRef.current = currentTime;
    }

    if (currentTime - lastFishTimeRef.current > 1500) {
      createFish();
      lastFishTimeRef.current = currentTime;
    }

    // Update obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obstacle = obstaclesRef.current[i];
      (obstacle as any).position.z += currentSpeed;
      
      if ((obstacle as any).position.z > 10) {
        sceneRef.current?.remove(obstacle);
        obstaclesRef.current.splice(i, 1);
      }
    }

    // Update fish
    for (let i = fishRef.current.length - 1; i >= 0; i--) {
      const fish = fishRef.current[i];
      const fishType = (fish as any).userData.type;
      const fishSpeed = FISH_TYPES[fishType].speed * currentSpeed;
      
      (fish as any).position.z += fishSpeed;
      (fish as any).position.y = 0.5 + Math.sin(Date.now() * 0.003 + i) * 0.1;
      
      if ((fish as any).position.z > 10) {
        sceneRef.current?.remove(fish);
        fishRef.current.splice(i, 1);
      }
    }

    // Update game time
    gameTimeRef.current += 1/120;
    setGameTime(gameTimeRef.current);

    // Check collisions
    checkCollisions();

    // Update environment
    updateEnvironment();
  };

  const checkCollisions = () => {
    if (!gameStarted || gameOver || !otterRef.current || !sceneRef.current) return;
    const scene = sceneRef.current;

    // Check obstacle collisions
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obstacle = obstaclesRef.current[i];
      const distance = (otterRef.current as any).position.distanceTo((obstacle as any).position);
      if (distance < 1.5) {
        setLives(prev => prev - 1);
        scene.remove(obstacle);
        obstaclesRef.current.splice(i, 1);
        if (lives <= 1) {
          endGame();
        }
      }
    }

    // Check fish collisions
    for (let i = fishRef.current.length - 1; i >= 0; i--) {
      const fish = fishRef.current[i];
      const distance = (otterRef.current as any).position.distanceTo((fish as any).position);
      if (distance < 1.5) {
        setScore(prev => prev + 1);
        scene.remove(fish);
        fishRef.current.splice(i, 1);
      }
    }
  };

  const endGame = () => {
    setGameOver(true);
    setGameStarted(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const updateEnvironment = () => {
    if (!gameStarted || gameOver || !sceneRef.current) return;
    const scene = sceneRef.current;

    // Animate river surface
    if (riverRef.current) {
      const time = Date.now() * 0.001;
      const vertices = (riverRef.current as any).geometry.attributes.position.array;
      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        vertices[i + 1] = Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.5 + time) * 0.2;
      }
      (riverRef.current as any).geometry.attributes.position.needsUpdate = true;
      (riverRef.current as any).geometry.computeVertexNormals();
    }

    // Animate sun
    if (scene.userData.sunGroup) {
      const sun = scene.userData.sunGroup;
      (sun as any).rotation.y += 0.0005;
      (sun as any).rotation.z = Math.sin(Date.now() * 0.0003) * 0.05;
    }

    // Animate clouds
    if (scene.userData.cloudGroup) {
      const cloudGroup = scene.userData.cloudGroup;
      cloudGroup.children.forEach((cloud: any) => {
        (cloud as any).position.x += (cloud as any).userData.speed;
        if ((cloud as any).position.x > 200) {
          (cloud as any).position.x = -200;
        }
        (cloud as any).position.y += Math.sin(Date.now() * 0.001 + (cloud as any).position.x) * 0.01;
      });
    }
  };

  const onWindowResize = () => {
    if (!cameraRef.current || !rendererRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update camera
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    
    // Update renderer
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (keysRef.current.hasOwnProperty(event.key)) {
      keysRef.current[event.key as keyof typeof keysRef.current] = true;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (keysRef.current.hasOwnProperty(event.key)) {
      keysRef.current[event.key as keyof typeof keysRef.current] = false;
    }
  };

  const resetGameState = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameStarted(false);
    setGameOver(false);
    setGameTime(0);
    obstaclesRef.current = [];
    fishRef.current = [];
    lastObstacleTimeRef.current = 0;
    lastFishTimeRef.current = 0;
    gameTimeRef.current = 0;
    baseSpeedRef.current = 0.2;
    currentObstacleIntervalRef.current = obstacleSpawnIntervalRef.current;
  };

  const createEnvironment = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Create sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial) as THREE.Mesh;
    (sun as any).position.set(30, 30, -50);
    scene.add(sun);

    // Add sun glow
    const sunGlowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial) as THREE.Mesh;
    (sunGlow as any).position.set(30, 30, -50);
    scene.add(sunGlow);

    // Create clouds
    const cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      roughness: 0.8,
      metalness: 0.2
    });

    for (let i = 0; i < 10; i++) {
      const cloud = createCloud(cloudMaterial);
      (cloud as any).position.set(
        (Math.random() - 0.5) * 300,
        20 + Math.random() * 15,
        -100 - Math.random() * 200
      );
      (cloud as any).scale.set(
        1 + Math.random(),
        1 + Math.random(),
        1 + Math.random()
      );
      cloud.userData = {
        speed: 0.02 + Math.random() * 0.03,
        initialX: (cloud as any).position.x
      };
      cloudGroup.add(cloud);
    }
    scene.add(cloudGroup);
    scene.userData.sunGroup = sun;
    scene.userData.cloudGroup = cloudGroup;
  };

  const createCloud = (material: THREE.Material) => {
    const cloudGroup = new THREE.Group();
    const numBlobs = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numBlobs; i++) {
      const blobGeometry = new THREE.SphereGeometry(1, 8, 8);
      const blob = new THREE.Mesh(blobGeometry, material as unknown as THREE.MeshBasicMaterial) as THREE.Mesh;
      (blob as any).position.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      (blob as any).scale.set(
        1 + Math.random(),
        1 + Math.random(),
        1 + Math.random()
      );
      cloudGroup.add(blob);
    }
    return cloudGroup;
  };

  const createRiver = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Create main water platform
    const waterGeometry = new THREE.PlaneGeometry(600, 600);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 1
    }) as unknown as THREE.MeshBasicMaterial;
    const water = new THREE.Mesh(waterGeometry, waterMaterial) as THREE.Mesh;
    (water as any).rotation.x = -Math.PI / 2;
    (water as any).position.y = -0.5;
    (water as any).position.z = -300;
    water.receiveShadow = true;
    scene.add(water);

    // Add bottom cover
    const bottomCoverGeometry = new THREE.BoxGeometry(600, 2, 600);
    const bottomCoverMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 0.1,
      metalness: 0.2
    }) as unknown as THREE.MeshBasicMaterial;
    const bottomCover = new THREE.Mesh(bottomCoverGeometry, bottomCoverMaterial) as THREE.Mesh;
    (bottomCover as any).position.set(0, -2, -300);
    bottomCover.receiveShadow = true;
    scene.add(bottomCover);

    // Main river
    const riverGeometry = new THREE.PlaneGeometry(40, 600, 40, 100);
    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    }) as unknown as THREE.MeshBasicMaterial;
    const river = new THREE.Mesh(riverGeometry, riverMaterial) as THREE.Mesh;
    (river as any).rotation.x = -Math.PI / 2;
    (river as any).position.z = -300;
    (river as any).position.y = 0.5;
    river.receiveShadow = true;
    scene.add(river);
    riverRef.current = river;

    // Add stream on the right side
    const streamGeometry = new THREE.PlaneGeometry(15, 600, 20, 100);
    const streamMaterial = new THREE.MeshStandardMaterial({
      color: 0x00BFFF,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    }) as unknown as THREE.MeshBasicMaterial;
    const stream = new THREE.Mesh(streamGeometry, streamMaterial) as THREE.Mesh;
    (stream as any).rotation.x = -Math.PI / 2;
    (stream as any).position.z = -300;
    (stream as any).position.y = 0.55;
    (stream as any).position.x = 50;
    stream.receiveShadow = true;
    scene.add(stream);

    // Add stream on the left side
    const stream2 = stream.clone();
    (stream2 as any).position.x = -50;
    scene.add(stream2);
  };

  const createOtter = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const otter = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial) as THREE.Mesh;
    (body as any).scale.set(1, 0.8, 1.2);
    body.castShadow = true;
    otter.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;
    const head = new THREE.Mesh(headGeometry, headMaterial) as THREE.Mesh;
    (head as any).position.set(0, 0.3, 0.8);
    head.castShadow = true;
    otter.add(head);

    // Snout
    const snoutGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const snoutMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial) as THREE.Mesh;
    (snout as any).position.set(0, 0.2, 1.2);
    (snout as any).scale.set(1, 0.8, 0.6);
    snout.castShadow = true;
    otter.add(snout);

    // Nose
    const noseGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }) as unknown as THREE.MeshBasicMaterial;
    const nose = new THREE.Mesh(noseGeometry, noseMaterial) as THREE.Mesh;
    (nose as any).position.set(0, 0.2, 1.35);
    otter.add(nose);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }) as unknown as THREE.MeshBasicMaterial;
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial) as THREE.Mesh;
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial) as THREE.Mesh;
    (leftEye as any).position.set(0.25, 0.4, 1.1);
    (rightEye as any).position.set(-0.25, 0.4, 1.1);
    otter.add(leftEye);
    otter.add(rightEye);

    // Ears
    const earGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const earMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;
    const leftEar = new THREE.Mesh(earGeometry, earMaterial) as THREE.Mesh;
    const rightEar = new THREE.Mesh(earGeometry, earMaterial) as THREE.Mesh;
    (leftEar as any).position.set(0.3, 0.6, 0.9);
    (rightEar as any).position.set(-0.3, 0.6, 0.9);
    otter.add(leftEar);
    otter.add(rightEar);

    // Tail
    const tailGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;
    const tail = new THREE.Mesh(tailGeometry, tailMaterial) as THREE.Mesh;
    (tail as any).position.set(0, 0.2, -1);
    (tail as any).scale.set(1.5, 0.2, 0.8);
    (tail as any).rotation.y = Math.PI / 2;
    tail.castShadow = true;
    otter.add(tail);

    // Legs
    const legGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    }) as unknown as THREE.MeshBasicMaterial;

    const positions = [
      [0.4, -0.2, 0.5],   // Front right
      [-0.4, -0.2, 0.5],  // Front left
      [0.4, -0.2, -0.5],  // Back right
      [-0.4, -0.2, -0.5]  // Back left
    ];

    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial) as THREE.Mesh;
      (leg as any).position.set(...pos);
      leg.castShadow = true;
      otter.add(leg);
    });

    // Set initial position
    (otter as any).position.set(0, 0.25, 0);
    (otter as any).rotation.y = Math.PI;
    scene.add(otter);
    otterRef.current = otter;
  };

  const startGame = () => {
    if (gameStarted) return;
    
    // Reset game state
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameTime(0);
    setGameOver(false);
    setGameStarted(true);
    
    // Reset refs
    lastObstacleTimeRef.current = Date.now();
    lastFishTimeRef.current = Date.now();
    gameTimeRef.current = 0;
    baseSpeedRef.current = 0.2;
    currentObstacleIntervalRef.current = obstacleSpawnIntervalRef.current;
    
    // Clear any existing obstacles and fish
    if (sceneRef.current) {
      obstaclesRef.current.forEach(obstacle => sceneRef.current!.remove(obstacle));
      fishRef.current.forEach(fish => sceneRef.current!.remove(fish));
      obstaclesRef.current = [];
      fishRef.current = [];
    }
    
    // Reset otter position
    if (otterRef.current) {
      (otterRef.current as any).position.set(0, 0.25, 0);
      (otterRef.current as any).rotation.y = Math.PI;
    }
    
    // Start level progression timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setLevel(prev => prev + 1);
      baseSpeedRef.current += 0.02;
    }, 15000);

    // Force a re-render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const restartGame = () => {
    // Clear existing game elements
    if (sceneRef.current) {
      obstaclesRef.current.forEach(obstacle => sceneRef.current!.remove(obstacle));
      fishRef.current.forEach(fish => sceneRef.current!.remove(fish));
    }
    
    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Reset game state
    resetGameState();
    setGameOver(false);
    startGame();
  };

  const submitScore = () => {
    const name = playerName.trim() || 'Anonymous';
    const newScore = {
      name,
      score,
      level,
      time: Math.round(gameTime)
    };
    
    const updatedLeaderboard = [...leaderboard, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('otterRiverLeaderboard', JSON.stringify(updatedLeaderboard));
    setPlayerName('');
  };

  const returnToMenu = () => {
    setGameOver(false);
    setGameStarted(false);
    resetGameState();
    if (otterRef.current) {
      (otterRef.current as any).position.set(0, 0.25, 0);
      (otterRef.current as any).rotation.y = Math.PI;
    }
    if (sceneRef.current) {
      obstaclesRef.current.forEach(obstacle => sceneRef.current!.remove(obstacle));
      fishRef.current.forEach(fish => sceneRef.current!.remove(fish));
      obstaclesRef.current = [];
      fishRef.current = [];
    }
    return false;
  };

  const createObstacle = () => {
    if (!gameStarted || gameOver || !sceneRef.current) return;

    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedType = 'rock';

    for (const [type, properties] of Object.entries(OBSTACLE_TYPES)) {
      cumulativeProbability += properties.probability;
      if (random <= cumulativeProbability) {
        selectedType = type;
        break;
      }
    }

    const obstacleProperties = OBSTACLE_TYPES[selectedType];
    const obstacle = new THREE.Mesh(
      obstacleProperties.geometry,
      new THREE.MeshStandardMaterial({
        color: obstacleProperties.color,
        roughness: 0.8,
        metalness: 0.2
      }) as unknown as THREE.MeshBasicMaterial
    ) as THREE.Mesh;
    
    (obstacle as any).position.x = (Math.random() - 0.5) * 40;
    (obstacle as any).position.y = 0.5;
    (obstacle as any).position.z = -60;
    
    (obstacle as any).rotation.x = Math.random() * Math.PI;
    (obstacle as any).rotation.y = Math.random() * Math.PI;
    (obstacle as any).rotation.z = Math.random() * Math.PI;
    
    (obstacle as any).scale.set(
      obstacleProperties.scale,
      obstacleProperties.scale,
      obstacleProperties.scale
    );
    
    obstacle.castShadow = true;
    obstacle.userData = { type: 'obstacle', obstacleType: selectedType };
    sceneRef.current.add(obstacle);
    obstaclesRef.current.push(obstacle);
  };

  const createFish = () => {
    if (!gameStarted || gameOver || !sceneRef.current) return;

    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedType = 'normal';

    for (const [type, properties] of Object.entries(FISH_TYPES)) {
      cumulativeProbability += properties.probability;
      if (random <= cumulativeProbability) {
        selectedType = type;
        break;
      }
    }

    const fishProperties = FISH_TYPES[selectedType];
    const fish = new THREE.Mesh(
      fishProperties.geometry,
      new THREE.MeshStandardMaterial({
        color: fishProperties.color,
        roughness: 0.3,
        metalness: 0.8
      }) as unknown as THREE.MeshBasicMaterial
    ) as THREE.Mesh;

    (fish as any).position.x = (Math.random() - 0.5) * 40;
    (fish as any).position.y = 0.5;
    (fish as any).position.z = -60;
    (fish as any).rotation.y = Math.PI / 2;
    (fish as any).scale.set(
      fishProperties.scale,
      fishProperties.scale,
      fishProperties.scale
    );
    fish.castShadow = true;
    fish.userData = { type: selectedType, points: fishProperties.points };
    sceneRef.current.add(fish);
    fishRef.current.push(fish);
  };

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#000',
      touchAction: 'none',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      KhtmlUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitOverflowScrolling: 'touch'
    }} className="game-container">
      <StartScreen />
      <GameOverScreen />
      <GameInfo />
    </div>
  );
};

export default Game; 