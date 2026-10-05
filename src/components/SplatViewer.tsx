import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SplatMesh, SplatLoader } from '@sparkjsdev/spark';
import type { ModelFormat } from '../modelFormat';

// Draco decoder is fetched from CDN only when a Draco-compressed glTF is loaded
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Free GPU resources held by a loaded glTF scene
function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const value of Object.values(mat)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      mat.dispose();
    }
  });
}

interface SplatViewerProps {
  splatUrl?: string;
  format?: ModelFormat;
  onLoadProgress?: (progress: number, loaded: number, total: number) => void;
  onLoadComplete?: () => void;
}

export function SplatViewer({ splatUrl, format = 'ply', onLoadProgress, onLoadComplete }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [debugInfo, setDebugInfo] = useState({
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0, z: 0 },
    sceneRot: { x: 0, y: 0, z: 0 },
  });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  // Currently loaded model: SplatMesh for PLY, pivot group for GLB
  const modelRef = useRef<THREE.Object3D | null>(null);
  const envMapRef = useRef<THREE.Texture | null>(null);
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

    // Environment map for PBR lighting of GLB models (splats ignore it)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    envMapRef.current = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

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
      if (modelRef.current) {
        const mesh = modelRef.current;
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
        sceneRot: modelRef.current ? {
          x: Math.round((modelRef.current.rotation.x * 180 / Math.PI) * 100) / 100,
          y: Math.round((modelRef.current.rotation.y * 180 / Math.PI) * 100) / 100,
          z: Math.round((modelRef.current.rotation.z * 180 / Math.PI) * 100) / 100,
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

      if (modelRef.current) {
        scene.remove(modelRef.current);
        if (!(modelRef.current instanceof SplatMesh)) disposeObject(modelRef.current);
        modelRef.current = null;
      }

      envMapRef.current?.dispose();
      envMapRef.current = null;

      if (renderer) {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load model when URL or format changes
  useEffect(() => {
    if (!splatUrl || !sceneRef.current) return;

    console.log(`Loading ${format} from:`, splatUrl);
    setLoading(true);
    setError(null);
    setLoadProgress(0);

    // Remove existing model
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      if (!(modelRef.current instanceof SplatMesh)) disposeObject(modelRef.current);
      modelRef.current = null;
    }
    sceneRef.current.environment = null;

    // Flag to prevent state updates after unmount
    let isMounted = true;

    const handleProgress = (event: ProgressEvent) => {
      if (!isMounted) return; // Prevent state updates if unmounted

      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        console.log(`Loading progress: ${progress.toFixed(1)}%`);
        setLoadProgress(progress);
        onLoadProgress?.(progress, event.loaded, event.total);
      }
    };

    const handleError = (err: unknown) => {
      if (!isMounted) return; // Prevent state updates if unmounted

      console.error(`Error loading ${format}:`, err);
      setError(err instanceof Error ? err.message : `Failed to load ${format}`);
      setLoading(false);
    };

    if (format === 'glb') {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.setMeshoptDecoder(MeshoptDecoder);

      gltfLoader.load(
        splatUrl,
        (gltf) => {
          dracoLoader.dispose();
          if (!isMounted) {
            disposeObject(gltf.scene);
            return;
          }

          try {
            const model = gltf.scene;

            // Center on bounding box and scale to max dimension 1 so the model
            // frames like the splats; glTF is Y-up so no base rotation needed
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 && Number.isFinite(maxDim) ? 1 / maxDim : 1;
            model.position.copy(center).multiplyScalar(-scale);
            model.scale.setScalar(scale);

            // Pivot group so arrow-key rotation turns the model about its center
            const pivot = new THREE.Group();
            pivot.add(model);
            pivot.position.set(0, 1, 0);

            if (sceneRef.current) {
              sceneRef.current.environment = envMapRef.current;
              sceneRef.current.add(pivot);
              modelRef.current = pivot;
            }

            console.log('GLB added to scene');
            setLoading(false);
            setLoadProgress(100);
            onLoadComplete?.();
          } catch (err) {
            console.error('Error setting up GLB:', err);
            setError(err instanceof Error ? err.message : 'Failed to set up GLB');
            setLoading(false);
          }
        },
        handleProgress,
        (err) => {
          dracoLoader.dispose();
          handleError(err);
        }
      );

      return () => {
        isMounted = false;
      };
    }

    // Use SplatLoader to get progress callbacks
    const loader = new SplatLoader();

    loader.load(
      splatUrl,
      // onLoad callback
      (packedSplats) => {
        if (!isMounted) return; // Prevent state updates if unmounted

        try {
          console.log('Splat loaded, creating mesh...');

          // Create mesh from loaded data
          const splatMesh = new SplatMesh({ packedSplats });
          splatMesh.position.set(0, 1, 0);  // Raise splat to center it in view
          splatMesh.scale.set(0.5, 0.5, 0.5); // Scale down to fit better in view

          // Apply coordinate system transformation: Z-up (PLY data) to Y-up (THREE.js)
          // Values determined through user testing for correct orientation
          splatMesh.rotation.x = 210 * Math.PI / 180;  // 210 degrees
          splatMesh.rotation.y = 0 * Math.PI / 180;   // 0 degrees
          splatMesh.rotation.z = 360 * Math.PI / 180;  // 360 degrees

          if (sceneRef.current) {
            sceneRef.current.add(splatMesh);
            modelRef.current = splatMesh;
          }

          console.log('SplatMesh added to scene');
          setLoading(false);
          setLoadProgress(100);
          onLoadComplete?.();
        } catch (err) {
          console.error('Error creating splat mesh:', err);
          setError(err instanceof Error ? err.message : 'Failed to create splat mesh');
          setLoading(false);
        }
      },
      // onProgress callback
      handleProgress,
      // onError callback
      handleError
    );

    // Cleanup function
    return () => {
      isMounted = false; // Prevent any further state updates from this load
    };
  }, [splatUrl, format]);

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
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '30px 40px',
          borderRadius: '12px',
          minWidth: '300px',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '500' }}>
            {format === 'glb' ? 'Loading GLB...' : 'Loading splat...'}
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '10px',
          }}>
            <div style={{
              width: `${loadProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
              transition: 'width 0.3s ease',
              borderRadius: '4px',
            }} />
          </div>

          {/* Progress percentage */}
          <div style={{
            fontSize: '14px',
            color: '#aaa',
            textAlign: 'center',
          }}>
            {loadProgress.toFixed(1)}%
          </div>
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

