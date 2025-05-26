import * as THREE from 'three';

console.log('Script started loading');

// Initialize game state and UI
const gameState = {
    score: 0,
    lives: 5,
    gameTime: 0,
    isPlaying: false,
    difficulty: 1,
    level: 1
};

try {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded');
        
        try {
            // Scene setup
            const scene = new THREE.Scene();
            console.log('Scene created');
            
            scene.background = new THREE.Color(0x87CEEB); // Sky blue background

            // Camera setup
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 5, 10);
            camera.lookAt(0, 0, 0);

            // Renderer setup
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);
            console.log('Renderer setup complete');

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            // River (ground)
            const riverGeometry = new THREE.PlaneGeometry(20, 100);
            const riverMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4169E1,
                roughness: 0.1,
                metalness: 0.2
            });
            const river = new THREE.Mesh(riverGeometry, riverMaterial);
            river.rotation.x = -Math.PI / 2;
            river.position.z = -20;
            river.receiveShadow = true;
            scene.add(river);

            // Otter (player)
            const otterGeometry = new THREE.BoxGeometry(1, 0.5, 2);
            const otterMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const otter = new THREE.Mesh(otterGeometry, otterMaterial);
            otter.position.y = 0.5;
            otter.castShadow = true;
            scene.add(otter);

            // Game objects
            const gameObjects = {
                fishes: [],
                obstacles: [],
                clams: []
            };

            // Fish types and their properties
            const fishTypes = {
                normal: { color: 0xFFD700, points: 1, probability: 0.6 },
                rainbow: { color: 0xFF69B4, points: 3, probability: 0.2 },
                golden: { color: 0xFFD700, points: 5, probability: 0.1 },
                emerald: { color: 0x50C878, points: 7, probability: 0.07 },
                diamond: { color: 0xB9F2FF, points: 10, probability: 0.03 }
            };

            // Obstacle types
            const obstacleTypes = {
                rock: { geometry: new THREE.DodecahedronGeometry(0.5), color: 0x808080 },
                log: { geometry: new THREE.CylinderGeometry(0.3, 0.3, 2, 8), color: 0x8B4513 },
                pole: { geometry: new THREE.CylinderGeometry(0.2, 0.2, 3, 8), color: 0x696969 },
                sharkFin: { geometry: new THREE.ConeGeometry(0.5, 1, 4), color: 0x000000 }
            };

            // Create fish
            function createFish() {
                const fishType = Object.entries(fishTypes).reduce((acc, [type, props]) => {
                    return Math.random() < props.probability ? type : acc;
                }, 'normal');

                const fishGeometry = new THREE.ConeGeometry(0.3, 1, 4);
                const fishMaterial = new THREE.MeshStandardMaterial({ 
                    color: fishTypes[fishType].color,
                    metalness: 0.5,
                    roughness: 0.2
                });
                const fish = new THREE.Mesh(fishGeometry, fishMaterial);
                fish.position.set(
                    (Math.random() - 0.5) * 15,
                    0.5,
                    -50 - Math.random() * 50
                );
                fish.rotation.y = Math.PI / 2;
                fish.castShadow = true;
                fish.userData = { type: fishType, points: fishTypes[fishType].points };
                scene.add(fish);
                gameObjects.fishes.push(fish);
            }

            // Create obstacle
            function createObstacle() {
                const obstacleType = Object.keys(obstacleTypes)[Math.floor(Math.random() * Object.keys(obstacleTypes).length)];
                const { geometry, color } = obstacleTypes[obstacleType];
                const material = new THREE.MeshStandardMaterial({ color });
                const obstacle = new THREE.Mesh(geometry, material);
                obstacle.position.set(
                    (Math.random() - 0.5) * 15,
                    0.5,
                    -50 - Math.random() * 50
                );
                obstacle.castShadow = true;
                obstacle.userData = { type: obstacleType };
                scene.add(obstacle);
                gameObjects.obstacles.push(obstacle);
            }

            // Create clam
            function createClam() {
                if (gameState.level < 2) return;
                
                const clamGeometry = new THREE.SphereGeometry(0.4, 16, 16);
                const clamMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xFFD700,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const clam = new THREE.Mesh(clamGeometry, clamMaterial);
                clam.position.set(
                    (Math.random() - 0.5) * 15,
                    0.5,
                    -50 - Math.random() * 50
                );
                clam.castShadow = true;
                scene.add(clam);
                gameObjects.clams.push(clam);
            }

            // Create initial game objects
            for (let i = 0; i < 10; i++) {
                createFish();
                createObstacle();
                createClam();
            }

            // Game controls
            const keys = {};
            document.addEventListener('keydown', (e) => keys[e.key] = true);
            document.addEventListener('keyup', (e) => keys[e.key] = false);

            // Update UI
            function updateUI() {
                const scoreElement = document.getElementById('score');
                if (scoreElement) {
                    scoreElement.textContent = `Score: ${gameState.score} | Lives: ${gameState.lives} | Level: ${gameState.level}`;
                }
            }

            // Check collisions
            function checkCollisions() {
                const otterPosition = otter.position.clone();

                // Check fish collisions
                gameObjects.fishes.forEach((fish, index) => {
                    if (Math.abs(fish.position.x - otterPosition.x) < 1 &&
                        Math.abs(fish.position.z - otterPosition.z) < 1) {
                        scene.remove(fish);
                        gameObjects.fishes.splice(index, 1);
                        gameState.score += fish.userData.points;
                        createFish();
                        updateUI();
                    }
                });

                // Check obstacle collisions
                gameObjects.obstacles.forEach((obstacle, index) => {
                    if (Math.abs(obstacle.position.x - otterPosition.x) < 1 &&
                        Math.abs(obstacle.position.z - otterPosition.z) < 1) {
                        scene.remove(obstacle);
                        gameObjects.obstacles.splice(index, 1);
                        gameState.lives--;
                        createObstacle();
                        updateUI();

                        if (gameState.lives <= 0) {
                            gameState.isPlaying = false;
                            alert('Game Over! Your score: ' + gameState.score);
                            location.reload();
                        }
                    }
                });

                // Check clam collisions
                gameObjects.clams.forEach((clam, index) => {
                    if (Math.abs(clam.position.x - otterPosition.x) < 1 &&
                        Math.abs(clam.position.z - otterPosition.z) < 1) {
                        scene.remove(clam);
                        gameObjects.clams.splice(index, 1);
                        gameState.score += 5;
                        gameState.lives = Math.min(gameState.lives + 1, 5);
                        createClam();
                        updateUI();
                    }
                });
            }

            // Animation loop
            function animate() {
                if (!gameState.isPlaying) return;

                requestAnimationFrame(animate);

                // Move otter
                if ((keys['ArrowLeft'] || keys['a']) && otter.position.x > -8) {
                    otter.position.x -= 0.2;
                }
                if ((keys['ArrowRight'] || keys['d']) && otter.position.x < 8) {
                    otter.position.x += 0.2;
                }

                // Move game objects
                const speed = 0.2 + (gameState.level * 0.05);

                gameObjects.fishes.forEach((fish, index) => {
                    fish.position.z += speed;
                    if (fish.position.z > 5) {
                        scene.remove(fish);
                        gameObjects.fishes.splice(index, 1);
                        createFish();
                    }
                });

                gameObjects.obstacles.forEach((obstacle, index) => {
                    obstacle.position.z += speed;
                    if (obstacle.position.z > 5) {
                        scene.remove(obstacle);
                        gameObjects.obstacles.splice(index, 1);
                        createObstacle();
                    }
                });

                gameObjects.clams.forEach((clam, index) => {
                    clam.position.z += speed;
                    if (clam.position.z > 5) {
                        scene.remove(clam);
                        gameObjects.clams.splice(index, 1);
                        createClam();
                    }
                });

                // Check collisions
                checkCollisions();

                // Level up
                if (gameState.score >= gameState.level * 10) {
                    gameState.level++;
                    updateUI();
                }

                renderer.render(scene, camera);
            }

            // Start the game
            gameState.isPlaying = true;
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            updateUI();
            animate();

            // Handle window resize
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        } catch (error) {
            console.error('Error in game initialization:', error);
        }
    });
} catch (error) {
    console.error('Error in script setup:', error);
} 