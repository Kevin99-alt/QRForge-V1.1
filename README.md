# ⬡ QRForge — QR Code Generator SaaS

A full-stack QR code generator with a premium dark UI, live preview, and high-quality PNG + SVG export.

---

## 📁 Project Structure

```
qrforge/
├── backend/
│   ├── main.py              ← FastAPI app (QR engine)
│   └── requirements.txt     ← Python dependencies
│
├── frontend/
│   ├── index.html           ← HTML entry point
│   ├── package.json         ← Node dependencies
│   ├── vite.config.js       ← Vite dev server config
│   ├── .env.example         ← Environment variables template
│   └── src/
│       ├── main.jsx         ← React entry point
│       ├── App.jsx          ← Main app component (UI + logic)
│       ├── App.css          ← Component styles
│       └── index.css        ← Global styles + design tokens
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| pip | latest |
| npm | 9+ |

---

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be running at: **http://localhost:8000**

> Test it: open http://localhost:8000/docs for the interactive Swagger UI.

---

### 2. Frontend Setup (React + Vite)

Open a **new terminal tab** (keep the backend running).

```bash
cd frontend

# Copy environment file
cp .env.example .env.local

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be running at: **http://localhost:5173**

---

## 🔧 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/preview` | Returns base64 PNG for live preview |
| `POST` | `/generate` | Streams PNG or SVG for download |
| `GET`  | `/health` | API health check |

### Request Body (POST /generate or /preview)

```json
{
  "type": "url",              // "url" | "vcard" | "wifi"
  "data": {
    "url": "https://example.com"
  },
  "style": "rounded",         // "square" | "rounded" | "circle"
  "fg_color": "#000000",      // foreground hex color
  "bg_color": "#ffffff",      // background hex color
  "error_correction": "H",    // "L" | "M" | "Q" | "H"
  "logo_base64": null,        // base64 data URI or null
  "format": "png",            // "png" | "svg"
  "size": 600                 // output px (use 1200 for download)
}
```

---

## ✨ Features

- **3 QR types**: URL, vCard (contact), Wi-Fi
- **3 module styles**: Square, Rounded, Circle
- **Custom colors**: Foreground + background with hex picker + presets
- **Logo embedding**: Centered with white padded background, auto-sized
- **Error correction**: L / M / Q / H levels
- **Live preview**: Debounced real-time preview as you type
- **Export PNG**: High-res 1200px PNG download
- **Export SVG**: True vector SVG via segno
- **Dark premium UI**: Instrument Serif + DM Sans, animated, fully responsive

---

## 🌐 Production Deployment

### Backend (e.g. Railway, Render, Fly.io)

```bash
# Build command
pip install -r requirements.txt

# Start command
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (e.g. Vercel, Netlify)

```bash
# Set env variable in dashboard
VITE_API_URL=https://your-backend-url.com

# Build command
npm run build

# Output directory
dist/
```

---

## 🛠 Extending QRForge

### Add a new QR type (e.g. SMS)

1. Add to `TABS` array in `App.jsx`
2. Add state + form fields for the new type
3. Add encoding logic in `build_qr_data()` in `main.py`

### Add more color presets

Edit the `COLOR_PRESETS` array in `App.jsx`.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.10+ |
| QR engine | `qrcode[pil]` (styled), `segno` (SVG) |
| Image processing | Pillow |
| Frontend | React 18, Vite |
| Styling | Pure CSS with CSS variables |
| Fonts | Instrument Serif, DM Sans (Google Fonts) |

---

## ⚠️ Notes

- **cairosvg** requires Cairo system library. On Ubuntu: `sudo apt install libcairo2`. On macOS: `brew install cairo`. If unavailable, SVG export falls back to segno-only mode (which is already in the code).
- Logo images are embedded at 22% of QR size with a padded white rounded background for optimal scannability.
- Error correction level **H** (30%) is recommended when using a logo.
