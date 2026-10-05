export type ModelFormat = 'ply' | 'glb';

// Detect model format from a file name or URL path. Anything that is not glTF
// falls through to the splat loader (PLY and other Spark-supported formats).
export function detectFormat(nameOrUrl: string): ModelFormat {
  let path = nameOrUrl;
  try {
    path = new URL(nameOrUrl, window.location.href).pathname;
  } catch {
    // Not a URL; treat as a plain file name
  }
  const lower = path.toLowerCase();
  return lower.endsWith('.glb') || lower.endsWith('.gltf') ? 'glb' : 'ply';
}
