# 3D Gaussian Splatting Viewer

Interactive web-based viewer for 3D Gaussian Splatting (3DGS) models with support for 3rd-order spherical harmonics (SH3).

## Features

- **High-fidelity rendering** using Spark (Three.js-based) with SH3 support
- **File upload interface** with drag-and-drop for PLY files
- **Automatic format conversion** to SOG when `@playcanvas/splat-transform` is available
- **Interactive controls:**
  - Mouse: OrbitControls for camera manipulation
  - Keyboard: WASDQE for camera positioning
- **Large file support** (tested with 300+ MB models)

## Tech Stack

### Frontend
- React 19.2.0 + TypeScript
- Vite 7.2.1
- Three.js 0.181.0 + Spark 0.1.10
- pnpm package manager

### Backend
- Node.js + TypeScript
- Express 5.1.0
- Multer 2.0.2 for file uploads

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Optional: Enable PLY to SOG conversion (2-5x compression)
pnpm add -g @playcanvas/splat-transform
```

### Development

```bash
# Start backend server (port 3001)
cd app/backend
pnpm dev

# Start frontend dev server (port 5173)
cd app/frontend
pnpm dev
```

Open http://localhost:5173 in your browser.

## Usage

1. Drag and drop a PLY file or click to browse
2. Upload will automatically convert to SOG format if conversion tool is installed
3. Use mouse to orbit/pan/zoom the 3D scene
4. Use WASDQE keys for precise camera positioning

## Deployment

Designed for deployment as a subroute on EKS clusters with VPN-protected asset storage.

## License

MIT
