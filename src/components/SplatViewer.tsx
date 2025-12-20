import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SplatMesh } from '@sparkjsdev/spark';

interface SplatViewerProps {
  splatUrl?: string;
}

export function SplatViewer({ splatUrl }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0, z: 0 },
    sceneRot: { x: 0, y: 0, z: 0 },
  });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const shiftPressed = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear any existing canvas elements (in case of StrictMode double-mount)
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    console.log('Container dimensions:', container.clientWidth, container.clientHeight);

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 1);
    cameraRef.current = camera;

    // Initialize renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: false,  // Disable antialiasing for better performance
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Cap pixel ratio for performance

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);  // Look at center of splat (raised up)
    controls.minPolarAngle = 0;      // Allow looking straight down
    controls.maxPolarAngle = Math.PI; // Allow looking straight up
    controls.update();
    controlsRef.current = controls;

    // Keyboard controls for camera movement and scene rotation
    const moveSpeed = 0.1;
    const rotationSpeed = 5 * Math.PI / 180; // 5 degrees per key press

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      // Track Shift key state
      if (e.key === 'Shift') {
        shiftPressed.current = true;
      }

      // Scene rotation controls (for debugging/adjusting orientation)
      // Hold Shift for 5x finer control
      if (splatMeshRef.current) {
        const mesh = splatMeshRef.current;
        const stepSize = e.shiftKey ? rotationSpeed / 5 : rotationSpeed;

        if (e.key === 'ArrowUp') {
          mesh.rotation.x += stepSize;
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          mesh.rotation.x -= stepSize;
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          mesh.rotation.y += stepSize;
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          mesh.rotation.y -= stepSize;
          e.preventDefault();
        } else if (e.key === '[') {
          mesh.rotation.z += stepSize;
          e.preventDefault();
        } else if (e.key === ']') {
          mesh.rotation.z -= stepSize;
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());

      // Track Shift key state
      if (e.key === 'Shift') {
        shiftPressed.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Handle WASD camera movement
      if (controlsRef.current && cameraRef.current) {
        const controls = controlsRef.current;
        const camera = cameraRef.current;

        // Apply 5x smaller steps when Shift is held
        const currentMoveSpeed = shiftPressed.current ? moveSpeed / 5 : moveSpeed;

        // Get camera direction vectors
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement horizontal
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        // Apply movement based on keys pressed
        if (keysPressed.current.has('w')) {
          camera.position.addScaledVector(forward, currentMoveSpeed);
          controls.target.addScaledVector(forward, currentMoveSpeed);
        }
        if (keysPressed.current.has('s')) {
          camera.position.addScaledVector(forward, -currentMoveSpeed);
          controls.target.addScaledVector(forward, -currentMoveSpeed);
        }
        if (keysPressed.current.has('a')) {
          camera.position.addScaledVector(right, -currentMoveSpeed);
          controls.target.addScaledVector(right, -currentMoveSpeed);
        }
        if (keysPressed.current.has('d')) {
          camera.position.addScaledVector(right, currentMoveSpeed);
          controls.target.addScaledVector(right, currentMoveSpeed);
        }
        if (keysPressed.current.has('q')) {
          camera.position.y -= currentMoveSpeed;
          controls.target.y -= currentMoveSpeed;
        }
        if (keysPressed.current.has('e')) {
          camera.position.y += currentMoveSpeed;
          controls.target.y += currentMoveSpeed;
        }

        controls.update();
      }

      // Update debug info
      setDebugInfo({
        cameraPos: {
          x: Math.round(camera.position.x * 100) / 100,
          y: Math.round(camera.position.y * 100) / 100,
          z: Math.round(camera.position.z * 100) / 100,
        },
        cameraRot: {
          x: Math.round((camera.rotation.x * 180 / Math.PI) * 100) / 100,
          y: Math.round((camera.rotation.y * 180 / Math.PI) * 100) / 100,
          z: Math.round((camera.rotation.z * 180 / Math.PI) * 100) / 100,
        },
        sceneRot: splatMeshRef.current ? {
          x: Math.round((splatMeshRef.current.rotation.x * 180 / Math.PI) * 100) / 100,
          y: Math.round((splatMeshRef.current.rotation.y * 180 / Math.PI) * 100) / 100,
          z: Math.round((splatMeshRef.current.rotation.z * 180 / Math.PI) * 100) / 100,
        } : { x: 0, y: 0, z: 0 },
      });

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (splatMeshRef.current) {
        scene.remove(splatMeshRef.current);
      }

      if (renderer) {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load splat when URL changes
  useEffect(() => {
    if (!splatUrl || !sceneRef.current) return;

    console.log('Loading splat from:', splatUrl);
    setLoading(true);
    setError(null);

    // Remove existing splat
    if (splatMeshRef.current) {
      sceneRef.current.remove(splatMeshRef.current);
      splatMeshRef.current = null;
    }

    try {
      console.log('Creating SplatMesh...');
      // Create and add splat mesh - it loads asynchronously in the background
      const splatMesh = new SplatMesh({ url: splatUrl });
      splatMesh.position.set(0, 1, 0);  // Raise splat to center it in view
      splatMesh.scale.set(0.5, 0.5, 0.5); // Scale down to fit better in view

      // Apply coordinate system transformation: Z-up (PLY data) to Y-up (THREE.js)
      // Values determined through user testing for correct orientation
      splatMesh.rotation.x = 210 * Math.PI / 180;  // 175 degrees
      splatMesh.rotation.y = 0 * Math.PI / 180;   // -5 degrees
      splatMesh.rotation.z = 360 * Math.PI / 180;  // 355 degrees

      sceneRef.current.add(splatMesh);
      splatMeshRef.current = splatMesh;

      console.log('SplatMesh added to scene, loading in background...');

      // Hide loading indicator after a short delay
      // The splat will continue loading and appear when ready
      setTimeout(() => setLoading(false), 3000);
    } catch (err) {
      console.error('Error creating splat:', err);
      setError(err instanceof Error ? err.message : 'Failed to create splat');
      setLoading(false);
    }
  }, [splatUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Debug Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#0f0',
        padding: '12px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.5',
        pointerEvents: 'auto',
        userSelect: 'text',
        cursor: 'text',
      }}>
        <div><strong>Camera Position:</strong></div>
        <div>  X: {debugInfo.cameraPos.x.toFixed(2)}</div>
        <div>  Y: {debugInfo.cameraPos.y.toFixed(2)}</div>
        <div>  Z: {debugInfo.cameraPos.z.toFixed(2)}</div>
        <div style={{ marginTop: '8px' }}><strong>Camera Rotation (deg):</strong></div>
        <div>  X: {debugInfo.cameraRot.x.toFixed(2)}</div>
        <div>  Y: {debugInfo.cameraRot.y.toFixed(2)}</div>
        <div>  Z: {debugInfo.cameraRot.z.toFixed(2)}</div>
        <div style={{ marginTop: '8px' }}><strong>Scene Rotation (deg):</strong></div>
        <div>  X: {debugInfo.sceneRot.x.toFixed(2)}</div>
        <div>  Y: {debugInfo.sceneRot.y.toFixed(2)}</div>
        <div>  Z: {debugInfo.sceneRot.z.toFixed(2)}</div>
        <div style={{ marginTop: '8px', borderTop: '1px solid #0f0', paddingTop: '8px' }}>
          <strong>Scene Rotation Controls:</strong>
        </div>
        <div>  ↑/↓: Rotate X axis</div>
        <div>  ←/→: Rotate Y axis</div>
        <div>  [/]: Rotate Z axis</div>
        <div style={{ marginTop: '4px', color: '#888', fontSize: '11px' }}>
          Hold Shift for 5x finer control
        </div>
      </div>

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
        }}>
          Loading splat...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}

