import * as THREE from 'three';

console.log('Script started loading');

// Initialize game state and UI
const gameState = {
    score: 0,
    lives: 3,
    gameTime: 0,
    isPlaying: false,
    difficulty: 1
};

try {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded');
        
        try {
            const startMenu = document.getElementById('startMenu');
            const gameUI = document.getElementById('gameUI');
            const startButton = document.getElementById('startButton');
            const instructionsButton = document.getElementById('instructionsButton');
            const loadingElement = document.getElementById('loading');
            const scoreElement = document.getElementById('score');
            
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

            // Fish (collectibles)
            const fishes = [];
            const fishGeometry = new THREE.ConeGeometry(0.3, 1, 4);
            const fishMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });

            function createFish() {
                const fish = new THREE.Mesh(fishGeometry, fishMaterial);
                fish.position.set(
                    (Math.random() - 0.5) * 15,
                    0.5,
                    -50 - Math.random() * 50
                );
                fish.rotation.y = Math.PI / 2;
                fish.castShadow = true;
                scene.add(fish);
                fishes.push(fish);
            }

            // Create initial fish
            for (let i = 0; i < 10; i++) {
                createFish();
            }

            // Game controls
            const keys = {};
            document.addEventListener('keydown', (e) => keys[e.key] = true);
            document.addEventListener('keyup', (e) => keys[e.key] = false);

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

                // Move fish
                fishes.forEach((fish, index) => {
                    fish.position.z += 0.2;
                    
                    // Check collision
                    if (Math.abs(fish.position.x - otter.position.x) < 1 &&
                        Math.abs(fish.position.z - otter.position.z) < 1) {
                        scene.remove(fish);
                        fishes.splice(index, 1);
                        gameState.score += 1;
                        scoreElement.textContent = `Score: ${gameState.score}`;
                        createFish();
                    }

                    // Remove fish that pass the camera
                    if (fish.position.z > 5) {
                        scene.remove(fish);
                        fishes.splice(index, 1);
                        createFish();
                    }
                });

                renderer.render(scene, camera);
            }

            // Start game function
            function startGame() {
                startMenu.style.display = 'none';
                gameUI.style.display = 'block';
                gameState.isPlaying = true;
                gameState.score = 0;
                scoreElement.textContent = `Score: ${gameState.score}`;
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                animate();
            }

            // Show instructions
            function showInstructions() {
                alert('How to Play:\n\n' +
                      '• Use Arrow Keys or A/D to move left and right\n' +
                      '• Collect fish to score points\n' +
                      '• Avoid obstacles\n' +
                      '• Game gets faster as you score more points');
            }

            // Event listeners for buttons
            startButton.addEventListener('click', startGame);
            instructionsButton.addEventListener('click', showInstructions);

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