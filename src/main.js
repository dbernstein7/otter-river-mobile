import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Game state
let scene, camera, renderer;
let otter, river;
let score = 0;
let lives = 3;
let gameStarted = false;
let gameOver = false;
let obstacles = [];
let fish = [];
let lastObstacleTime = 0;
let lastFishTime = 0;
let gameTime = 0;
let level = 1;
let timerInterval;
let baseSpeed = 0.2;
let obstacleSpawnInterval = 300; // Base interval for obstacle spawning (in ms)
let currentObstacleInterval = obstacleSpawnInterval; // Current interval that changes with level

// Movement controls
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// Leaderboard functionality
let leaderboard = JSON.parse(localStorage.getItem('otterRiverLeaderboard')) || [];

// Fish types and their properties
const FISH_TYPES = {
    normal: {
        color: 0xFFD700, // Gold
        points: 1,
        speed: 0.3, // Increased from 0.15
        scale: 1,
        probability: 0.3
    },
    rainbow: {
        color: 0xFF69B4, // Pink
        points: 3,
        speed: 0.4, // Increased from 0.2
        scale: 1.2,
        probability: 0.15
    },
    golden: {
        color: 0xFFA500, // Orange
        points: 5,
        speed: 0.5, // Increased from 0.25
        scale: 1.4,
        probability: 0.1
    },
    emerald: {
        color: 0x00FF00, // Green
        points: 7,
        speed: 0.6, // Increased from 0.3
        scale: 1.6,
        probability: 0.1
    },
    diamond: {
        color: 0x00FFFF, // Cyan
        points: 10,
        speed: 0.7, // Increased from 0.35
        scale: 1.8,
        probability: 0.05
    },
    clam: {
        color: 0xFFE4E1, // Misty Rose
        points: 15,
        speed: 0.2, // Increased from 0.1
        scale: 1.2,
        probability: 0.05,
        isClam: true
    },
    seahorse: {
        color: 0x9370DB, // Medium Purple
        points: 8,
        speed: 0.3, // Increased from 0.15
        scale: 1.3,
        probability: 0.1,
        isSpecial: true
    },
    jellyfish: {
        color: 0xFFB6C1, // Light Pink
        points: 12,
        speed: 0.4, // Increased from 0.2
        scale: 1.5,
        probability: 0.08,
        isSpecial: true
    },
    starfish: {
        color: 0xFF4500, // Orange Red
        points: 6,
        speed: 0.2, // Increased from 0.1
        scale: 1.2,
        probability: 0.07,
        isSpecial: true
    }
};

// Obstacle types and their properties
const OBSTACLE_TYPES = {
    rock: {
        geometry: new THREE.DodecahedronGeometry(1, 0),
        color: 0x808080,
        scale: 1,
        probability: 0.3 // Increased probability
    },
    log: {
        geometry: new THREE.CylinderGeometry(0.5, 0.5, 3, 8),
        color: 0x8B4513,
        scale: 1,
        probability: 0.3 // Increased probability
    },
    boat: {
        geometry: new THREE.BoxGeometry(2, 0.5, 4),
        color: 0x8B4513,
        scale: 1,
        probability: 0.2
    },
    island: {
        geometry: new THREE.ConeGeometry(2, 1, 8),
        color: 0x90EE90,
        scale: 1,
        probability: 0.1
    },
    shark: {
        geometry: new THREE.ConeGeometry(0.5, 2, 8),
        color: 0x4682B4,
        scale: 1,
        probability: 0.1
    }
};

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, -100);
    scene.add(camera);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
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

    // Show start screen
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('game-over').style.display = 'none';

    // Start animation loop
    animate();
}

function resetGameState() {
    score = 0;
    lives = 3;
    gameStarted = false;
    gameOver = false;
    obstacles = [];
    fish = [];
    lastObstacleTime = 0;
    lastFishTime = 0;
    gameTime = 0;
    level = 1;
    baseSpeed = 0.2;
    currentObstacleInterval = obstacleSpawnInterval;

    // Update UI
    updateScore();
    updateLives();
    updateLevel();
    updateLeaderboard();
}

// Create the river
function createRiver() {
    // Create main water platform
    const waterGeometry = new THREE.PlaneGeometry(600, 600);
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x0077be,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 1
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    water.position.z = -300;
    water.receiveShadow = true;
    scene.add(water);

    // Add bottom cover
    const bottomCoverGeometry = new THREE.BoxGeometry(600, 2, 600);
    const bottomCoverMaterial = new THREE.MeshStandardMaterial({
        color: 0x0077be,
        roughness: 0.1,
        metalness: 0.2
    });
    const bottomCover = new THREE.Mesh(bottomCoverGeometry, bottomCoverMaterial);
    bottomCover.position.set(0, -2, -300);
    bottomCover.receiveShadow = true;
    scene.add(bottomCover);

    // Main river
    const riverGeometry = new THREE.PlaneGeometry(40, 600, 40, 100);
    const riverMaterial = new THREE.MeshStandardMaterial({
        color: 0x0077be,
        roughness: 1.0, // Max roughness to remove all reflections
        metalness: 0.0, // No metalness
        transparent: true,
        opacity: 0.9
    });
    river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.z = -300;
    river.position.y = 0.5;
    river.receiveShadow = true;
    scene.add(river);

    // Add stream on the right side
    const streamGeometry = new THREE.PlaneGeometry(15, 600, 20, 100);
    const streamMaterial = new THREE.MeshStandardMaterial({
        color: 0x00BFFF,
        roughness: 1.0, // Max roughness to remove all reflections
        metalness: 0.0, // No metalness
        transparent: true,
        opacity: 0.9
    });
    const stream = new THREE.Mesh(streamGeometry, streamMaterial);
    stream.rotation.x = -Math.PI / 2;
    stream.position.z = -300;
    stream.position.y = 0.55;
    stream.position.x = 50;
    stream.receiveShadow = true;
    scene.add(stream);

    // Add stream on the left side
    const stream2 = stream.clone();
    stream2.position.x = -50;
    scene.add(stream2);
}

// Create the otter
function createOtter() {
    otter = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 0.8, 1.2);
    body.castShadow = true;
    otter.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.3, 0.8);
    head.castShadow = true;
    otter.add(head);

    // Snout
    const snoutGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const snoutMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    snout.position.set(0, 0.2, 1.2);
    snout.scale.set(1, 0.8, 0.6);
    snout.castShadow = true;
    otter.add(snout);

    // Nose
    const noseGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.2, 1.35);
    otter.add(nose);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.25, 0.4, 1.1);
    rightEye.position.set(-0.25, 0.4, 1.1);
    otter.add(leftEye);
    otter.add(rightEye);

    // Ears
    const earGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const earMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(0.3, 0.6, 0.9);
    rightEar.position.set(-0.3, 0.6, 0.9);
    otter.add(leftEar);
    otter.add(rightEar);

    // Tail
    const tailGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const tailMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.2, -1);
    tail.scale.set(1.5, 0.2, 0.8); // Adjusted scale for long and skinny tail
    tail.rotation.y = Math.PI / 2; // Rotate tail 90 degrees around Y axis
    tail.castShadow = true;
    otter.add(tail);

    // Legs
    const legGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });

    const positions = [
        [0.4, -0.2, 0.5],   // Front right
        [-0.4, -0.2, 0.5],  // Front left
        [0.4, -0.2, -0.5],  // Back right
        [-0.4, -0.2, -0.5]  // Back left
    ];

    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(...pos);
        leg.castShadow = true;
        otter.add(leg);
    });

    // Only add the top hat and brim if unlocked and checkbox is checked
    if (localStorage.getItem('topHatUnlocked') === 'true' && document.getElementById('top-hat-toggle').checked) {
        // Top Hat
        const hatGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
        const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, 0.8, 0.8);
        hat.castShadow = true;
        hat.userData = { type: 'hat' };
        otter.add(hat);

        // Brim
        const brimGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const brimMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const brim = new THREE.Mesh(brimGeometry, brimMaterial);
        brim.position.set(0, 0.6, 0.8);
        brim.castShadow = true;
        brim.userData = { type: 'brim' };
        otter.add(brim);
    }

    // Add crown with torus lowered to touch otter's head
    const crownGroup = new THREE.Group();
    const bandGeometry = new THREE.TorusGeometry(0.32, 0.07, 8, 24);
    const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.set(0, 0.75, 0.8); // Lowered position to touch otter's head
    band.rotation.x = Math.PI / 2;
    band.userData = { type: 'crown-band' };
    crownGroup.add(band);

    // Add 3 triangles upright
    for (let i = 0; i < 3; i++) {
        const triangleGeometry = new THREE.ConeGeometry(0.2, 0.6, 3);
        const triangleMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
        const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
        const angle = (i / 3) * Math.PI * 2;
        triangle.position.set(Math.cos(angle) * 0.23, 0.88, 0.8 + Math.sin(angle) * 0.23); // Adjusted position
        triangle.rotation.x = 0; // Upright triangles
        triangle.userData = { type: 'crown-triangle' };
        crownGroup.add(triangle);
    }
    crownGroup.userData = { type: 'crown' };
    otter.add(crownGroup);

    // Set initial position
    otter.position.set(0, 0.25, 0);
    otter.rotation.y = Math.PI;
    scene.add(otter);
}

// Create an obstacle
function createObstacle() {
    if (!gameStarted || gameOver) return;

    // Select obstacle type based on probability
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
        })
    );
    
    // Random position across the river
    obstacle.position.x = (Math.random() - 0.5) * 40;
    obstacle.position.y = 0.5;
    obstacle.position.z = -60;
    
    // Random rotation
    obstacle.rotation.x = Math.random() * Math.PI;
    obstacle.rotation.y = Math.random() * Math.PI;
    obstacle.rotation.z = Math.random() * Math.PI;
    
    obstacle.scale.set(
        obstacleProperties.scale,
        obstacleProperties.scale,
        obstacleProperties.scale
    );
    
    obstacle.castShadow = true;
    obstacle.userData = { type: 'obstacle', obstacleType: selectedType };
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// Create a fish
function createFish() {
    if (!gameStarted || gameOver) return;

    // Select fish type based on probability
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
    const fishGroup = new THREE.Group();

    if (fishProperties.isClam) {
        // Create clam
        const shellGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const shellMaterial = new THREE.MeshStandardMaterial({
            color: fishProperties.color,
            roughness: 0.3,
            metalness: 0.8
        });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        shell.scale.set(1, 0.6, 0.8);
        shell.castShadow = true;
        fishGroup.add(shell);

        // Add pearl
        const pearlGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const pearlMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.1,
            metalness: 0.9
        });
        const pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
        pearl.position.set(0, 0.1, 0);
        fishGroup.add(pearl);
    } else if (fishProperties.isSpecial) {
        if (selectedType === 'seahorse') {
            // Create seahorse
            const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: fishProperties.color,
                roughness: 0.3,
                metalness: 0.8
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.rotation.x = Math.PI / 2;
            body.castShadow = true;
            fishGroup.add(body);

            // Add head
            const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.set(0, 0.5, 0);
            fishGroup.add(head);

            // Add tail
            const tailGeometry = new THREE.ConeGeometry(0.1, 0.4, 4);
            const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
            tail.position.set(0, -0.5, 0);
            tail.rotation.x = -Math.PI / 2;
            fishGroup.add(tail);
        } else if (selectedType === 'jellyfish') {
            // Create jellyfish
            const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: fishProperties.color,
                roughness: 0.3,
                metalness: 0.8,
                transparent: true,
                opacity: 0.8
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.scale.set(1, 0.8, 1);
            body.castShadow = true;
            fishGroup.add(body);

            // Add tentacles
            for (let i = 0; i < 8; i++) {
                const tentacleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
                const tentacle = new THREE.Mesh(tentacleGeometry, bodyMaterial);
                const angle = (i / 8) * Math.PI * 2;
                tentacle.position.set(
                    Math.cos(angle) * 0.2,
                    -0.4,
                    Math.sin(angle) * 0.2
                );
                tentacle.rotation.x = Math.PI / 2;
                fishGroup.add(tentacle);
            }
        } else if (selectedType === 'starfish') {
            // Create starfish
            const starGeometry = new THREE.CircleGeometry(0.4, 5);
            const starMaterial = new THREE.MeshStandardMaterial({
                color: fishProperties.color,
                roughness: 0.3,
                metalness: 0.8
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.rotation.x = -Math.PI / 2;
            star.castShadow = true;
            fishGroup.add(star);
        }
    } else {
        // Regular fish body
        const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: fishProperties.color,
            roughness: 0.3,
            metalness: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 0.6, 1.2); // Adjusted proportions
        body.castShadow = true;
        fishGroup.add(body);

        // Tail
        const tailGeometry = new THREE.ConeGeometry(0.4, 0.8, 4);
        const tailMaterial = new THREE.MeshStandardMaterial({
            color: fishProperties.color,
            roughness: 0.3,
            metalness: 0.8
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0, -0.8);
        tail.rotation.x = Math.PI / 2;
        tail.scale.set(1, 0.8, 1); // Adjusted tail proportions
        tail.castShadow = true;
        fishGroup.add(tail);

        // Dorsal fin (top fin)
        const dorsalFinGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
        const dorsalFin = new THREE.Mesh(dorsalFinGeometry, tailMaterial);
        dorsalFin.position.set(0, 0.3, 0);
        dorsalFin.rotation.x = -Math.PI / 2;
        dorsalFin.castShadow = true;
        fishGroup.add(dorsalFin);

        // Pectoral fins (side fins)
        const finGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
        const finMaterial = new THREE.MeshStandardMaterial({
            color: fishProperties.color,
            roughness: 0.3,
            metalness: 0.8
        });
        
        // Left pectoral fin
        const leftFin = new THREE.Mesh(finGeometry, finMaterial);
        leftFin.position.set(0.4, 0, 0.2);
        leftFin.rotation.z = -Math.PI / 2;
        leftFin.rotation.y = Math.PI / 4;
        leftFin.castShadow = true;
        fishGroup.add(leftFin);
        
        // Right pectoral fin
        const rightFin = new THREE.Mesh(finGeometry, finMaterial);
        rightFin.position.set(-0.4, 0, 0.2);
        rightFin.rotation.z = Math.PI / 2;
        rightFin.rotation.y = -Math.PI / 4;
        rightFin.castShadow = true;
        fishGroup.add(rightFin);

        // Pelvic fins (bottom fins)
        const pelvicFinGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
        const pelvicFinMaterial = new THREE.MeshStandardMaterial({
            color: fishProperties.color,
            roughness: 0.3,
            metalness: 0.8
        });

        // Left pelvic fin
        const leftPelvicFin = new THREE.Mesh(pelvicFinGeometry, pelvicFinMaterial);
        leftPelvicFin.position.set(0.2, -0.2, 0.2);
        leftPelvicFin.rotation.x = Math.PI / 2;
        leftPelvicFin.rotation.z = Math.PI / 4;
        leftPelvicFin.castShadow = true;
        fishGroup.add(leftPelvicFin);

        // Right pelvic fin
        const rightPelvicFin = new THREE.Mesh(pelvicFinGeometry, pelvicFinMaterial);
        rightPelvicFin.position.set(-0.2, -0.2, 0.2);
        rightPelvicFin.rotation.x = Math.PI / 2;
        rightPelvicFin.rotation.z = -Math.PI / 4;
        rightPelvicFin.castShadow = true;
        fishGroup.add(rightPelvicFin);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 0.1, 0.4);
        fishGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.2, 0.1, 0.4);
        fishGroup.add(rightEye);

        // Mouth
        const mouthGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 0, 0.6);
        mouth.rotation.x = Math.PI / 2;
        fishGroup.add(mouth);
    }

    // Position the fish
    fishGroup.position.x = (Math.random() - 0.5) * 40;
    fishGroup.position.y = 0.5;
    fishGroup.position.z = -60;
    
    // Random rotation
    fishGroup.rotation.y = Math.random() * Math.PI * 2;
    
    // Scale based on fish type
    fishGroup.scale.set(
        fishProperties.scale,
        fishProperties.scale,
        fishProperties.scale
    );
    
    fishGroup.userData = { type: selectedType };
    scene.add(fishGroup);
    fish.push(fishGroup);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down events
function onKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
}

// Handle key up events
function onKeyUp(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
}

// Check for collisions
function checkCollisions() {
    if (!gameStarted || gameOver) return;

    // Check obstacle collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const distance = otter.position.distanceTo(obstacle.position);
        
        if (distance < 1.5) {
            // Collision with obstacle
            lives--;
            updateLives();
            scene.remove(obstacle);
            obstacles.splice(i, 1);
            
            if (lives <= 0) {
                endGame();
            }
        }
    }

    // Check fish collisions
    for (let i = fish.length - 1; i >= 0; i--) {
        const fishObj = fish[i];
        const distance = otter.position.distanceTo(fishObj.position);
        
        if (distance < 1.5) {
            // Collect fish
            const fishType = fishObj.userData.type;
            const fishPoints = FISH_TYPES[fishType].points;
            score += fishPoints;
            updateScore();
            scene.remove(fishObj);
            fish.splice(i, 1);
        }
    }
}

// End game function
function endGame() {
    gameOver = true;
    gameStarted = false;
    
    // Clear timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Show game over screen
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score').textContent = `Final Score: ${score}`;
    document.getElementById('name-input').style.display = 'block';
    
    // Allow player to input name
    const nameInput = document.getElementById('player-name');
    nameInput.focus();
    
    // Save score, level, and time to localStorage
    const scores = JSON.parse(localStorage.getItem('scores') || '[]');
    scores.push({ name: nameInput.value.trim() || 'Anonymous', score: score, level: level, time: Math.round(gameTime) });
    localStorage.setItem('scores', JSON.stringify(scores));
    
    // Unlock top hat if score >= 100
    if (score >= 100) {
        localStorage.setItem('topHatUnlocked', 'true');
    }
    // Unlock crown if score >= 300
    if (score >= 300) {
        localStorage.setItem('crownUnlocked', 'true');
    }
    updateUnlockables();
    // Update leaderboard
    updateLeaderboard();
}

// Update game state
function update() {
    if (!gameStarted || gameOver) return;

    // Move otter based on key presses
    const moveSpeed = 0.2;
    let moving = false;
    let targetRotation = otter.rotation.y;

    if (keys.ArrowUp || keys.w) {
        otter.position.z -= moveSpeed;
        targetRotation = Math.PI;
        moving = true;
    }
    if (keys.ArrowDown || keys.s) {
        otter.position.z += moveSpeed;
        targetRotation = 0;
        moving = true;
    }
    if (keys.ArrowLeft || keys.a) {
        otter.position.x -= moveSpeed;
        targetRotation = -Math.PI / 2;
        moving = true;
    }
    if (keys.ArrowRight || keys.d) {
        otter.position.x += moveSpeed;
        targetRotation = Math.PI / 2;
        moving = true;
    }

    // Smoothly rotate otter to face movement direction
    if (moving) {
        otter.rotation.y = THREE.MathUtils.lerp(otter.rotation.y, targetRotation, 0.2);
    }

    // Keep otter within bounds
    otter.position.x = Math.max(-20, Math.min(20, otter.position.x));
    otter.position.z = Math.max(-49, Math.min(49, otter.position.z));

    // Calculate current speed based on level
    const currentSpeed = baseSpeed * (1 + (level - 1) * 0.15); // Increased speed progression

    // Update obstacle spawn interval based on level
    currentObstacleInterval = Math.max(100, obstacleSpawnInterval - (level * 20)); // Decreases by 20ms per level, minimum 100ms

    // Spawn obstacles and fish
    const currentTime = Date.now();
    if (currentTime - lastObstacleTime > currentObstacleInterval) {
        createObstacle();
        // Chance to spawn additional obstacles based on level
        if (Math.random() < (level * 0.1)) { // 10% chance per level to spawn extra obstacle
            createObstacle();
        }
        lastObstacleTime = currentTime;
    }

    if (currentTime - lastFishTime > 1500) {
        createFish();
        lastFishTime = currentTime;
    }

    // Update obstacles with level-based speed
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].position.z += currentSpeed;
        
        if (obstacles[i].position.z > 10) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
        }
    }

    // Update fish with level-based speed
    for (let i = fish.length - 1; i >= 0; i--) {
        const fishObj = fish[i];
        const fishType = fishObj.userData.type;
        const fishSpeed = FISH_TYPES[fishType].speed * currentSpeed;
        
        fishObj.position.z += fishSpeed;
        
        // Add gentle up and down motion
        fishObj.position.y = 0.5 + Math.sin(Date.now() * 0.003 + i) * 0.1;
        
        if (fishObj.position.z > 10) {
            scene.remove(fishObj);
            fish.splice(i, 1);
        }
    }

    // Update timer and date
    gameTime += 1/120; // Slowed down timer
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('date').textContent = new Date().toLocaleDateString();

    // Check collisions
    checkCollisions();

    // Update environment
    updateEnvironment();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Start game function
window.startGame = function() {
    if (gameStarted) return;
    
    gameStarted = true;
    gameOver = false;
    
    // Hide start screen
    document.getElementById('start-screen').style.display = 'none';
    
    // Start timer for level progression
    timerInterval = setInterval(() => {
        level++;
        updateLevel();
        showLevelUpMessage();
        // Increase base speed slightly with each level
        baseSpeed += 0.02;
    }, 15000); // Changed from 30000 to 15000 (15 seconds)
    
    // Start spawning obstacles and fish
    lastObstacleTime = Date.now();
    lastFishTime = Date.now();
};

// Restart game function
window.restartGame = function() {
    // Clear existing game elements
    obstacles.forEach(obstacle => scene.remove(obstacle));
    fish.forEach(fish => scene.remove(fish));
    
    // Clear timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Reset game state
    resetGameState();
    
    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';
    
    // Start new game
    startGame();
};

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

// Update lives display
function updateLives() {
    document.getElementById('lives').textContent = `Lives: ${lives}`;
}

// Update level display
function updateLevel() {
    document.getElementById('level').textContent = `Level: ${level}`;
}

// Leaderboard functionality
function updateLeaderboard() {
    const leaderboardList = document.getElementById('top-scores');
    const startScores = document.getElementById('start-scores');
    leaderboardList.innerHTML = '';
    startScores.innerHTML = '';
    const scores = JSON.parse(localStorage.getItem('scores') || '[]');
    scores.sort((a, b) => b.score - a.score);
    scores.slice(0, 5).forEach(score => {
        if (score.name !== 'Anonymous') {
            const li = document.createElement('li');
            li.textContent = `${score.name}: ${score.score} points, Level ${score.level}, Time ${score.time}`;
            leaderboardList.appendChild(li);
            startScores.appendChild(li.cloneNode(true));
        }
    });
}

// Submit score function
window.submitScore = function() {
    const nameInput = document.getElementById('player-name');
    const playerName = nameInput.value.trim() || 'Anonymous';
    
    // Add score to leaderboard
    const scores = JSON.parse(localStorage.getItem('scores') || '[]');
    scores.push({ name: playerName, score: score, level: level, time: Math.round(gameTime) });
    localStorage.setItem('scores', JSON.stringify(scores));
    
    // Update leaderboard display
    updateLeaderboard();
    
    // Clear input
    nameInput.value = '';
};

// Reset leaderboard
function resetLeaderboard() {
    localStorage.removeItem('scores');
    updateLeaderboard();
}

// Call resetLeaderboard on game initialization
window.onload = function() {
    init();
    resetLeaderboard();
    updateUnlockables();
};

// Create the scene environment
function createEnvironment() {
    // Create sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(30, 30, -50);
    scene.add(sun);

    // Add sun glow
    const sunGlowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.3
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.set(30, 30, -50); // Ensure sun glow does not overlap with water
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

    // Create multiple clouds
    for (let i = 0; i < 10; i++) {
        const cloud = createCloud(cloudMaterial);
        // Position clouds randomly in the sky, but below the sun
        cloud.position.set(
            (Math.random() - 0.5) * 300,
            20 + Math.random() * 15, // Lowered cloud height
            -100 - Math.random() * 200
        );
        cloud.scale.set(
            1 + Math.random(),
            1 + Math.random(),
            1 + Math.random()
        );
        cloud.userData = {
            speed: 0.02 + Math.random() * 0.03,
            initialX: cloud.position.x
        };
        cloudGroup.add(cloud);
    }

    scene.add(cloudGroup);

    // Store references for animation
    scene.userData.sunGroup = sun;
    scene.userData.cloudGroup = cloudGroup;
}

function createCloud(material) {
    const cloudGroup = new THREE.Group();
    
    // Create multiple spheres to form a cloud
    const numSpheres = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numSpheres; i++) {
        const radius = 3 + Math.random() * 2;
        const geometry = new THREE.SphereGeometry(radius, 8, 8);
        const sphere = new THREE.Mesh(geometry, material);
        
        // Position spheres to form a cloud shape
        sphere.position.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 8
        );
        
        cloudGroup.add(sphere);
    }
    
    return cloudGroup;
}

// Update the environment movement
function updateEnvironment() {
    if (!gameStarted || gameOver) return;

    // Animate river surface
    if (river) {
        const time = Date.now() * 0.001;
        const vertices = river.geometry.attributes.position.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.5 + time) * 0.2;
        }
        
        river.geometry.attributes.position.needsUpdate = true;
        river.geometry.computeVertexNormals();
    }

    // Animate sun
    if (scene.userData.sunGroup) {
        const sun = scene.userData.sunGroup;
        sun.rotation.y += 0.0005; // Slowed down rotation
        sun.rotation.z = Math.sin(Date.now() * 0.0003) * 0.05; // Reduced wobble
    }

    // Animate clouds
    if (scene.userData.cloudGroup) {
        const cloudGroup = scene.userData.cloudGroup;
        cloudGroup.children.forEach(cloud => {
            // Move cloud
            cloud.position.x += cloud.userData.speed;
            
            // Reset cloud position if it goes too far
            if (cloud.position.x > 200) {
                cloud.position.x = -200;
            }
            
            // Add gentle floating motion
            cloud.position.y += Math.sin(Date.now() * 0.001 + cloud.position.x) * 0.01;
        });
    }
}

function showLevelUpMessage() {
    let msg = document.getElementById('level-up-message');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'level-up-message';
        document.body.appendChild(msg);
    }
    msg.textContent = `Level ${level}!`;
    msg.style.display = 'block';
    msg.style.opacity = '1';
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => { msg.style.display = 'none'; }, 500);
    }, 1000);
}

// Update unlockables section on start menu
function updateUnlockables() {
    const unlocked = localStorage.getItem('topHatUnlocked') === 'true';
    const status = document.getElementById('top-hat-status');
    const toggle = document.getElementById('top-hat-toggle');
    if (status) {
        if (unlocked) {
            status.textContent = 'Unlocked!';
            status.style.color = '#4CAF50';
            toggle.disabled = false;
        } else {
            status.textContent = 'Locked (Score 100+ in a game)';
            status.style.color = '#ff00ff';
            toggle.disabled = true;
        }
    }
    const crownStatus = document.getElementById('crown-status');
    const crownToggle = document.getElementById('crown-toggle');
    const crownUnlocked = localStorage.getItem('crownUnlocked') === 'true';
    if (crownStatus) {
        if (crownUnlocked) {
            crownStatus.textContent = 'Unlocked!';
            crownStatus.style.color = '#FFD700';
            crownToggle.disabled = false;
        } else {
            crownStatus.textContent = 'Locked (Score 300+ in a game)';
            crownStatus.style.color = '#ff00ff';
            crownToggle.disabled = true;
        }
    }
}

// Add event listener for top hat toggle
document.getElementById('top-hat-toggle').addEventListener('change', function() {
    if (this.checked) {
        // Add top hat to otter
        const hatGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
        const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, 0.8, 0.8);
        hat.castShadow = true;
        hat.userData = { type: 'hat' };
        otter.add(hat);

        // Add brim
        const brimGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const brimMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const brim = new THREE.Mesh(brimGeometry, brimMaterial);
        brim.position.set(0, 0.6, 0.8);
        brim.castShadow = true;
        brim.userData = { type: 'brim' };
        otter.add(brim);
    } else {
        // Remove top hat and brim from otter
        const hat = otter.children.find(child => child.userData && child.userData.type === 'hat');
        if (hat) otter.remove(hat);
        const brim = otter.children.find(child => child.userData && child.userData.type === 'brim');
        if (brim) otter.remove(brim);
    }
    // Remove any existing crown
    const crown = otter.children.find(child => child.userData && child.userData.type === 'crown');
    if (crown) otter.remove(crown);
    const crownToggle = document.getElementById('crown-toggle');
    if (crownToggle) crownToggle.checked = false;
});

// Add event listener for crown toggle
if (document.getElementById('crown-toggle')) {
    document.getElementById('crown-toggle').addEventListener('change', function() {
        // Remove any existing crown or top hat
        const crown = otter.children.find(child => child.userData && child.userData.type === 'crown');
        if (crown) otter.remove(crown);
        const hat = otter.children.find(child => child.userData && child.userData.type === 'hat');
        if (hat) otter.remove(hat);
        const brim = otter.children.find(child => child.userData && child.userData.type === 'brim');
        if (brim) otter.remove(brim);
        if (this.checked) {
            // Add crown with torus lowered to touch otter's head
            const crownGroup = new THREE.Group();
            const bandGeometry = new THREE.TorusGeometry(0.32, 0.07, 8, 24);
            const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
            const band = new THREE.Mesh(bandGeometry, bandMaterial);
            band.position.set(0, 0.75, 0.8); // Lowered position to touch otter's head
            band.rotation.x = Math.PI / 2;
            band.userData = { type: 'crown-band' };
            crownGroup.add(band);

            // Add 3 triangles upright
            for (let i = 0; i < 3; i++) {
                const triangleGeometry = new THREE.ConeGeometry(0.2, 0.6, 3);
                const triangleMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
                const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
                const angle = (i / 3) * Math.PI * 2;
                triangle.position.set(Math.cos(angle) * 0.23, 0.88, 0.8 + Math.sin(angle) * 0.23); // Adjusted position
                triangle.rotation.x = 0; // Upright triangles
                triangle.userData = { type: 'crown-triangle' };
                crownGroup.add(triangle);
            }
            crownGroup.userData = { type: 'crown' };
            otter.add(crownGroup);
            // Uncheck top hat if checked
            const topHatToggle = document.getElementById('top-hat-toggle');
            if (topHatToggle) topHatToggle.checked = false;
        }
    });
}

function returnToMenu() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    resetGameState();
    // Remove top hat from otter if it was added
    if (otter) {
        const hat = otter.children.find(child => child.userData && child.userData.type === 'hat');
        if (hat) {
            otter.remove(hat);
        }
    }
    // Stop the game loop
    gameStarted = false;
    gameOver = true;
    // Clear existing game elements
    obstacles.forEach(obstacle => scene.remove(obstacle));
    fish.forEach(fish => scene.remove(fish));
    obstacles = [];
    fish = [];
    // Reset otter position
    otter.position.set(0, 0.25, 0);
    otter.rotation.y = Math.PI;
    return false;
} 