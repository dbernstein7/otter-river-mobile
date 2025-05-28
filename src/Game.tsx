import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
    <div className="overlay" style={{ display: gameStarted ? 'none' : 'flex' }}>
      <h2>Otter River Adventure</h2>
      <button onClick={() => setGameStarted(true)}>Start Game</button>
      <h3>Leaderboard</h3>
      <ol>
        {leaderboard.slice(0, 5).map((entry: any, idx: number) => (
          <li key={idx}>{entry.name}: {entry.score} pts, Level {entry.level}, Time {entry.time}</li>
        ))}
      </ol>
    </div>
  );

  const GameOverScreen = () => (
    <div className="overlay" style={{ display: gameOver ? 'flex' : 'none' }}>
      <h2>Game Over</h2>
      <div>Final Score: {score}</div>
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
        style={{ margin: '10px' }}
      />
      <button onClick={() => setGameOver(false)}>Return to Menu</button>
    </div>
  );

  useEffect(() => {
    if (!containerRef.current || gameStarted) return;

    const init = async () => {
      try {
        // Create game container
        const gameContainer = document.createElement('div');
        gameContainer.id = 'game-container';
        gameContainer.style.width = '100%';
        gameContainer.style.height = '100%';
        containerRef.current!.appendChild(gameContainer);

        // Initialize Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        (camera as any).position.set(0, 15, 20);
        (camera as any).lookAt(0, 0, -100);
        cameraRef.current = camera;
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        (renderer as any).shadowMap.enabled = true;
        (renderer as any).shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;
        gameContainer.appendChild(renderer.domElement);

        // Add lights
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

        // Reset game state
        resetGameState();

        // Start animation loop
        animate();
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    init();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (containerRef.current) {
        const gameContainer = containerRef.current.querySelector('#game-container');
        if (gameContainer) {
          containerRef.current.removeChild(gameContainer);
        }
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [gameStarted]);

  // Game functions
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
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    (sun as any).position.set(30, 30, -50);
    scene.add(sun);

    // Add sun glow
    const sunGlowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
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
      const cloud = createCloud(cloudMaterial as unknown as THREE.MeshBasicMaterial);
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
      const blob = new THREE.Mesh(blobGeometry, material as unknown as THREE.MeshBasicMaterial);
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
    const riverGeometry = new THREE.PlaneGeometry(100, 1000, 20, 20);
    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x4682B4,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8
    });
    const river = new THREE.Mesh(riverGeometry, riverMaterial as unknown as THREE.MeshBasicMaterial);
    (river as any).rotation.x = -Math.PI / 2;
    (river as any).position.z = -500;
    river.receiveShadow = true;
    scene.add(river);
    riverRef.current = river;
  };

  const createOtter = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const otterGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const otterMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.2
    });
    const otter = new THREE.Mesh(otterGeometry, otterMaterial as unknown as THREE.MeshBasicMaterial);
    (otter as any).position.set(0, 0.25, 0);
    (otter as any).rotation.y = Math.PI;
    otter.castShadow = true;
    scene.add(otter);
    otterRef.current = otter;
  };

  const onWindowResize = () => {
    if (!cameraRef.current || !rendererRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
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
    obstaclesRef.current = [];
    fishRef.current = [];
    lastObstacleTimeRef.current = 0;
    lastFishTimeRef.current = 0;
    gameTimeRef.current = 0;
    baseSpeedRef.current = 0.2;
    currentObstacleIntervalRef.current = obstacleSpawnIntervalRef.current;
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    requestAnimationFrame(animate);
    update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

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

    // Update game time
    gameTimeRef.current += 1/120;

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

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <StartScreen />
      <GameOverScreen />
      {/* Score, lives, level display */}
      <div style={{ position: 'absolute', top: 10, left: 10, color: '#222', zIndex: 2 }}>
        <div>Score: {score}</div>
        <div>Lives: {lives}</div>
        <div>Level: {level}</div>
      </div>
    </div>
  );
};

export default Game; 