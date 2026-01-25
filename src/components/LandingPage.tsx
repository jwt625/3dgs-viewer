import { useState, useRef } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLoadUrl: (url: string) => void;
  onLoadFile: (file: File) => void;
}

interface Example {
  id: string;
  name: string;
  description: string;
  url: string;
  previewUrl?: string;
  sizeMB: number;
  category: 'featured' | 'photonics' | 'semiconductor' | 'display' | 'reconstruction';
}

const EXAMPLES: Example[] = [
  // Featured Examples (3 representative)
  {
    id: 'spectra_physics',
    name: 'Spectra-Physics Navigator J40-X30SC',
    description: '1064 nm DPSS Q-switched laser system',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250420_Spectra-Physics-Navigator-J40-X30SC.ply',
    previewUrl: '/3dgs-viewer/preview/spectra_physics_preview.png',
    sizeMB: 172,
    category: 'featured',
  },
  {
    id: 'laser_phosphor',
    name: 'Prysm LPD Laser Engine',
    description: '405nm laser scanning engine for large-format video walls',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250619_Laser_Phosphor_Display_laser_engine.ply',
    previewUrl: '/3dgs-viewer/preview/laser_phosphor_preview.png',
    sizeMB: 127,
    category: 'featured',
  },
  {
    id: 'innolight_200g',
    name: 'Innolight 200G QSFP56 FR4',
    description: 'CWDM4 optical transceiver, 4×50Gb/s PAM4, 3km reach',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250409_innolight_200G.ply',
    previewUrl: '/3dgs-viewer/preview/innolight_200g_preview.png',
    sizeMB: 154,
    category: 'featured',
  },

  // Photonics & Optical Communications
  {
    id: 'intel_cwdm',
    name: 'Intel 100G CWDM4 QSFP28',
    description: 'Silicon photonics transceiver, 1271-1331nm, 2km SMF',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250403_intel100G_CWDM.ply',
    previewUrl: '/3dgs-viewer/preview/intel_cwdm_preview.png',
    sizeMB: 126,
    category: 'photonics',
  },
  {
    id: 'coherent_laser',
    name: 'Coherent Compass 315M',
    description: '532nm CW green DPSS laser, diode-pumped solid state',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250413_coherent_laser_20070912.ply',
    previewUrl: '/3dgs-viewer/preview/coherent_laser_preview.png',
    sizeMB: 129,
    category: 'photonics',
  },
  {
    id: 'coherent_laser_v2',
    name: 'Coherent Compass 315M (v2)',
    description: 'Updated scan of 532nm green DPSS laser',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250414_coherent_laser_v2_20070912.ply',
    previewUrl: '/3dgs-viewer/preview/coherent_laser_v2_preview.png',
    sizeMB: 136,
    category: 'photonics',
  },
  {
    id: 'fiber_optic',
    name: 'Fiber Optic Test Setup',
    description: 'Optical measurement and alignment station',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/apple_sharp/20251219_fiber_optic_setup_IMG_7935.ply',
    previewUrl: '/3dgs-viewer/preview/fiber_optic_preview.png',
    sizeMB: 66,
    category: 'photonics',
  },
  {
    id: 'microscope',
    name: 'Microscope & Precision Stages',
    description: 'Optical inspection and positioning equipment',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/apple_sharp/20251219_microscope_and_stages_IMG_8595.ply',
    previewUrl: '/3dgs-viewer/preview/microscope_preview.png',
    sizeMB: 66,
    category: 'photonics',
  },

  // Semiconductor Manufacturing
  {
    id: 'tpt_hb16',
    name: 'TPT HB16 Wire Bonder',
    description: 'Thermosonic wire bonder for wedge and ball bonding',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20250504_tpt_HB16.ply',
    previewUrl: '/3dgs-viewer/preview/tpt_hb16_preview.png',
    sizeMB: 137,
    category: 'semiconductor',
  },
  {
    id: 'sam3_wirebonds',
    name: 'Wire Bond Connections',
    description: 'SAM3 reconstruction of semiconductor wire bonding',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/SAM3/20251121_wirebonds_reconstruction.ply',
    previewUrl: '/3dgs-viewer/preview/sam3_wirebonds_preview.png',
    sizeMB: 18,
    category: 'semiconductor',
  },

  // Display Technology
  {
    id: 'crt_display',
    name: '4-inch Mini CRT Display',
    description: 'Compact cathode ray tube display module',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/20251004_CRT_display.ply',
    previewUrl: '/3dgs-viewer/preview/crt_display_preview.png',
    sizeMB: 150,
    category: 'display',
  },

  // 3D Reconstruction Examples
  {
    id: 'sam3_vehicle',
    name: 'Hyundai Dashboard Transport',
    description: 'SAM3: Industrial AGV for automotive assembly',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/SAM3/20251119-a-low-slung-square-blue-vehicle-carries-dashboards-to-be-installed-in-hyundai-sport-utility-vehicles-vehicle_reconstruction.ply',
    previewUrl: '/3dgs-viewer/preview/sam3_vehicle_preview.png',
    sizeMB: 63,
    category: 'reconstruction',
  },
  {
    id: 'chlorine',
    name: 'Chemical Sample Container',
    description: 'Apple Object Capture scan',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/apple_sharp/20251217_chlorine_IMG_3753.ply',
    previewUrl: '/3dgs-viewer/preview/chlorine_preview.png',
    sizeMB: 66,
    category: 'reconstruction',
  },
  {
    id: 'jean_klee',
    name: 'Jean & Klee Meme',
    description: 'Apple Object Capture scan of Genshin Impact meme print',
    url: 'https://huggingface.co/datasets/jwt625/splat/resolve/main/apple_sharp/20251219_Jean_Klee_IMG_4974.ply',
    previewUrl: '/3dgs-viewer/preview/jean_klee_preview.png',
    sizeMB: 66,
    category: 'reconstruction',
  },
];

export function LandingPage({ onLoadUrl, onLoadFile }: LandingPageProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loadingExampleId, setLoadingExampleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onLoadUrl(urlInput.trim());
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      onLoadFile(file);
    }
  };

  const handleExampleClick = (example: Example) => {
    setLoadingExampleId(example.id);
    onLoadUrl(example.url);
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header */}
        <header className="landing-header">
          <h1>3D Gaussian Splatting Viewer</h1>
          <p className="subtitle">
            Interactive web-based viewer for 3DGS models with high-fidelity rendering
          </p>
        </header>

        {/* URL Input Section */}
        <section className="url-section">
          <form onSubmit={handleUrlSubmit} className="url-form">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste PLY file URL here..."
              className="url-input"
            />
            <button type="submit" className="url-submit-btn" disabled={!urlInput.trim()}>
              Load URL
            </button>
          </form>
        </section>

        {/* File Upload Section */}
        <section className="upload-section">
          <div
            className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ply"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="upload-text">Drop PLY file here or click to browse</p>
            <p className="upload-hint">Supports .ply files up to 500MB</p>
          </div>
        </section>

        {/* Examples Section */}
        <section className="examples-section">
          <h3 className="examples-title">Featured Examples</h3>
          <div className="examples-grid">
            {EXAMPLES.filter(ex => ex.category === 'featured').map((example) => (
              <button
                key={example.id}
                className={`example-card ${loadingExampleId === example.id ? 'loading' : ''}`}
                onClick={() => handleExampleClick(example)}
                disabled={loadingExampleId !== null}
              >
                {example.previewUrl && (
                  <div className="example-preview">
                    <img src={example.previewUrl} alt={example.name} />
                  </div>
                )}
                {loadingExampleId === example.id && (
                  <div className="loading-spinner"></div>
                )}
                <div className="example-content">
                  <h4 className="example-name">{example.name}</h4>
                  <p className="example-description">{example.description}</p>
                  <span className="example-size">{example.sizeMB} MB</span>
                </div>
              </button>
            ))}
          </div>

          <h3 className="examples-title" style={{ marginTop: '3rem' }}>Browse by Category</h3>

          {/* Photonics & Optical Communications */}
          <div className="category-section">
            <h4 className="category-title">Photonics & Optical Communications</h4>
            <div className="examples-grid">
              {EXAMPLES.filter(ex => ex.category === 'photonics').map((example) => (
                <button
                  key={example.id}
                  className={`example-card ${loadingExampleId === example.id ? 'loading' : ''}`}
                  onClick={() => handleExampleClick(example)}
                  disabled={loadingExampleId !== null}
                >
                  {example.previewUrl && (
                    <div className="example-preview">
                      <img src={example.previewUrl} alt={example.name} />
                    </div>
                  )}
                  {loadingExampleId === example.id && (
                    <div className="loading-spinner"></div>
                  )}
                  <div className="example-content">
                    <h4 className="example-name">{example.name}</h4>
                    <p className="example-description">{example.description}</p>
                    <span className="example-size">{example.sizeMB} MB</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Semiconductor Manufacturing */}
          <div className="category-section">
            <h4 className="category-title">Semiconductor Manufacturing</h4>
            <div className="examples-grid">
              {EXAMPLES.filter(ex => ex.category === 'semiconductor').map((example) => (
                <button
                  key={example.id}
                  className={`example-card ${loadingExampleId === example.id ? 'loading' : ''}`}
                  onClick={() => handleExampleClick(example)}
                  disabled={loadingExampleId !== null}
                >
                  {example.previewUrl && (
                    <div className="example-preview">
                      <img src={example.previewUrl} alt={example.name} />
                    </div>
                  )}
                  {loadingExampleId === example.id && (
                    <div className="loading-spinner"></div>
                  )}
                  <div className="example-content">
                    <h4 className="example-name">{example.name}</h4>
                    <p className="example-description">{example.description}</p>
                    <span className="example-size">{example.sizeMB} MB</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Display Technology */}
          <div className="category-section">
            <h4 className="category-title">Display Technology</h4>
            <div className="examples-grid">
              {EXAMPLES.filter(ex => ex.category === 'display').map((example) => (
                <button
                  key={example.id}
                  className={`example-card ${loadingExampleId === example.id ? 'loading' : ''}`}
                  onClick={() => handleExampleClick(example)}
                  disabled={loadingExampleId !== null}
                >
                  {example.previewUrl && (
                    <div className="example-preview">
                      <img src={example.previewUrl} alt={example.name} />
                    </div>
                  )}
                  {loadingExampleId === example.id && (
                    <div className="loading-spinner"></div>
                  )}
                  <div className="example-content">
                    <h4 className="example-name">{example.name}</h4>
                    <p className="example-description">{example.description}</p>
                    <span className="example-size">{example.sizeMB} MB</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3D Reconstruction Examples */}
          <div className="category-section">
            <h4 className="category-title">3D Reconstruction Examples</h4>
            <div className="examples-grid">
              {EXAMPLES.filter(ex => ex.category === 'reconstruction').map((example) => (
                <button
                  key={example.id}
                  className={`example-card ${loadingExampleId === example.id ? 'loading' : ''}`}
                  onClick={() => handleExampleClick(example)}
                  disabled={loadingExampleId !== null}
                >
                  {example.previewUrl && (
                    <div className="example-preview">
                      <img src={example.previewUrl} alt={example.name} />
                    </div>
                  )}
                  {loadingExampleId === example.id && (
                    <div className="loading-spinner"></div>
                  )}
                  <div className="example-content">
                    <h4 className="example-name">{example.name}</h4>
                    <p className="example-description">{example.description}</p>
                    <span className="example-size">{example.sizeMB} MB</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>
            Built on top of{' '}
            <a href="https://github.com/sparkjsdev/spark" target="_blank" rel="noopener noreferrer">
              spark
            </a>{' '}
            by{' '}
            <a href="https://outside5sigma.com/" target="_blank" rel="noopener noreferrer">
              Wentao
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

