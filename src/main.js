import * as THREE from 'three';

// Initialize game state and UI
const gameState = {
    score: 0,
    lives: 3,
    gameTime: 0,
    isPlaying: false,
    difficulty: 1
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add a simple cube for testing
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

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

// Update UI
const scoreElement = document.getElementById('score');
const loadingElement = document.getElementById('loading');

if (loadingElement) {
    loadingElement.style.display = 'none';
}

if (scoreElement) {
    scoreElement.textContent = `Fish: ${gameState.score}`;
} 