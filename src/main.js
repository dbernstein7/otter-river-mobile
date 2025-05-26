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
            // Scene setup
            const scene = new THREE.Scene();
            console.log('Scene created');
            
            scene.background = new THREE.Color(0x87CEEB);
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);
            console.log('Renderer setup complete');

            // Add a simple cube for testing
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
            console.log('Cube added to scene');

            camera.position.z = 5;

            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
                renderer.render(scene, camera);
            }

            // Start the game
            gameState.isPlaying = true;
            animate();
            console.log('Animation started');

            // Update UI
            const scoreElement = document.getElementById('score');
            const loadingElement = document.getElementById('loading');

            if (loadingElement) {
                loadingElement.style.display = 'none';
                console.log('Loading screen hidden');
            } else {
                console.error('Loading element not found');
            }

            if (scoreElement) {
                scoreElement.textContent = `Fish: ${gameState.score}`;
                console.log('Score updated');
            } else {
                console.error('Score element not found');
            }

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