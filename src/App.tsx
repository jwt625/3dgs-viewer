import { useState, useEffect } from 'react';
import { SplatViewer } from './components/SplatViewer';
import { LandingPage } from './components/LandingPage';
import { detectFormat, type ModelFormat } from './modelFormat';
import './App.css';

function App() {
  const [splatUrl, setSplatUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<ModelFormat>('ply');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showLanding, setShowLanding] = useState<boolean>(true);

  // Handle loading progress
  const handleLoadProgress = (_progress: number, loaded: number, total: number) => {
    const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
    const totalMB = (total / (1024 * 1024)).toFixed(1);
    setUploadStatus(`Loading: ${loadedMB} MB / ${totalMB} MB`);
  };

  // Handle loading complete
  const handleLoadComplete = () => {
    setUploadStatus('Loading complete!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Handle loading from URL
  const handleLoadUrl = (url: string) => {
    console.log('Loading from URL:', url);
    setFormat(detectFormat(url));
    setSplatUrl(url);
    setShowLanding(false);
    setUploadStatus('Starting download...');
  };

  // Handle loading from file
  const handleLoadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    console.log('Loading from local file:', file.name);
    // Blob URLs carry no extension, so detect format from the file name
    setFormat(detectFormat(file.name));
    setSplatUrl(url);
    setShowLanding(false);
    setUploadStatus(`Loading ${file.name}...`);
  };

  // Check for URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');

    if (urlParam) {
      console.log('Loading from URL parameter:', urlParam);
      handleLoadUrl(urlParam);
    }
  }, []);

  // Show landing page if no file is loaded
  if (showLanding && !splatUrl) {
    return <LandingPage onLoadUrl={handleLoadUrl} onLoadFile={handleLoadFile} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Fullscreen viewer */}
      <SplatViewer
        splatUrl={splatUrl || undefined}
        format={format}
        onLoadProgress={handleLoadProgress}
        onLoadComplete={handleLoadComplete}
      />

      {/* Top-left overlay with controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)',
        maxWidth: '400px',
        zIndex: 1000,
      }}>
        <h1
          onClick={() => window.location.reload()}
          style={{
            margin: '0 0 10px 0',
            fontSize: '1.5em',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          3D Gaussian Splatting Viewer
        </h1>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#ccc' }}>
          <strong>Controls:</strong> WASDQE to move, Mouse to rotate
        </p>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowLanding(true)}
            style={{
              background: 'rgba(100, 181, 246, 0.2)',
              border: '1px solid rgba(100, 181, 246, 0.5)',
              color: '#64B5F6',
              padding: '2px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '0.8em',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 181, 246, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(100, 181, 246, 0.2)'}
          >
            Load Another File
          </button>
        </p>
        <p style={{ margin: '0', fontSize: '0.75em', color: '#999' }}>
          Built on top of <a href="https://github.com/sparkjsdev/spark" target="_blank" rel="noopener noreferrer" style={{ color: '#64B5F6', textDecoration: 'none' }}>spark</a> by <a href="https://outside5sigma.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#64B5F6', textDecoration: 'none' }}>Wentao</a>
        </p>
        {uploadStatus && (
          <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#4CAF50' }}>
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
