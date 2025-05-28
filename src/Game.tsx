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
    probability: 0.7
  },
  rare: {
    geometry: new THREE.ConeGeometry(0.5, 2, 8),
    color: 0xFF69B4,
    scale: 1.2,
    speed: 1.2,
    points: 3,
    probability: 0.3
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      animation: 'fadeIn 0.5s ease-out',
      touchAction: 'none',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      overflow: 'hidden'
    }}>
      <h1 style={{
        fontSize: '2rem',
        color: '#fff',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
        marginBottom: '2rem',
        animation: 'glow 2s infinite alternate',
        textAlign: 'center',
        padding: '0 20px'
      }}>Otter Adventure</h1>
      <button
        id="startGame"
        name="startGame"
        onClick={startGame}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startGame();
        }}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 20px rgba(76, 175, 80, 0.3)',
          animation: 'fadeIn 0.5s ease-out 0.3s both',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          minWidth: '200px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 20px',
          position: 'relative',
          zIndex: 1001
        }}
        className="start-button"
      >
        Start Adventure
      </button>
      <div style={{
        marginTop: '2rem',
        color: '#fff',
        textAlign: 'center',
        maxWidth: '600px',
        animation: 'fadeIn 0.5s ease-out 0.6s both',
        padding: '0 20px'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>How to Play</h2>
        <p style={{ marginBottom: '0.5rem' }}>Swipe to move the otter</p>
        <p style={{ marginBottom: '0.5rem' }}>Collect fish to earn points</p>
        <p style={{ marginBottom: '0.5rem' }}>Avoid obstacles to stay alive</p>
        <p>Complete levels to progress!</p>
      </div>
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <h1 style={{
        fontSize: '3rem',
        color: '#fff',
        marginBottom: '1rem',
        animation: 'glow 2s infinite alternate'
      }}>Game Over</h1>
      <p style={{
        fontSize: '1.5rem',
        color: '#fff',
        marginBottom: '2rem',
        animation: 'fadeIn 0.5s ease-out 0.3s both'
      }}>
        Final Score: {score}
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        animation: 'fadeIn 0.5s ease-out 0.6s both'
      }}>
        <input
          id="playerName"
          name="playerName"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.2rem',
            borderRadius: '25px',
            border: '2px solid rgba(255, 0, 255, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            width: '250px',
            animation: 'borderPulse 2s infinite'
          }}
        />
        <button
          id="submitScore"
          name="submitScore"
          onClick={submitScore}
          style={{
            padding: '0.8rem 1.5rem',
            fontSize: '1.2rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 20px rgba(76, 175, 80, 0.3)'
          }}
          className="start-button"
        >
          Submit Score
        </button>
      </div>
      <div style={{
        marginTop: '2rem',
        color: '#fff',
        textAlign: 'center',
        animation: 'fadeIn 0.5s ease-out 0.9s both'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Leaderboard</h2>
        {leaderboard.map((entry, index) => (
          <div key={index} style={{
            marginBottom: '0.5rem',
            fontSize: '1.2rem',
            color: index === 0 ? '#FFD700' : '#fff'
          }}>
            {entry.name}: {entry.score}
          </div>
        ))}
      </div>
    </div>
  );

  const GameInfo = () => (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: '#fff',
      fontSize: '1.2rem',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
      zIndex: 100,
      animation: 'fadeIn 0.5s ease-out'
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

    // Set up camera with adjusted position for mobile
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    (camera as any).position.set(0, 5, 10);
    (camera as any).lookAt(0, 0, -10);
    cameraRef.current = camera;
    scene.add(camera);

    // Set up renderer with proper mobile settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    (renderer as any).shadowMap.enabled = true;
    (renderer as any).shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Add touch event listeners with improved handling
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

      // Update key states based on touch movement with increased sensitivity
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

    // Add touch event listeners with passive: false to ensure preventDefault works
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Add lights with increased intensity for mobile
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    (directionalLight as any).position.set(5, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Create environment with adjusted scale
    createEnvironment();

    // Create river with adjusted scale
    createRiver();

    // Create otter with adjusted scale
    createOtter();

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Start animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Always render the scene, even when game is not started
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
    const riverGeometry = new THREE.PlaneGeometry(20, 200, 20, 20); // Much smaller for mobile
    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x4682B4,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    }) as unknown as THREE.MeshBasicMaterial;
    const river = new THREE.Mesh(riverGeometry, riverMaterial) as THREE.Mesh;
    (river as any).rotation.x = -Math.PI / 2;
    (river as any).position.z = -100; // Much closer for mobile
    river.receiveShadow = true;
    scene.add(river);
    riverRef.current = river;
  };

  const createOtter = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const otterGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 4, 8); // Much smaller for mobile
    const otterMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.2
    }) as unknown as THREE.MeshBasicMaterial;
    const otter = new THREE.Mesh(otterGeometry, otterMaterial) as THREE.Mesh;
    (otter as any).position.set(0, 0.25, 0); // Much lower for mobile
    (otter as any).rotation.y = Math.PI;
    otter.castShadow = true;
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