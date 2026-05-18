# 🧪 VIRTUAL-LAB — Collaborative Physics Sandbox

A real-time, multiplayer physics simulation environment built for IIT JEE mechanics problem-solving. Create experiments with rigid bodies, springs, ropes, and pivots — then analyze velocity, acceleration, and kinetic energy in real time.

![Tech Stack](https://img.shields.io/badge/React-19-blue?logo=react) ![Tech Stack](https://img.shields.io/badge/Vite-8-purple?logo=vite) ![Tech Stack](https://img.shields.io/badge/Express-4-green?logo=express) ![Tech Stack](https://img.shields.io/badge/MongoDB-8-darkgreen?logo=mongodb) ![Tech Stack](https://img.shields.io/badge/Socket.IO-4-black?logo=socketdotio) ![Tech Stack](https://img.shields.io/badge/Matter.js-0.20-orange)

---

## ✨ Features

- **Physics Engine** — Matter.js-powered rigid body simulation with rectangles, circles, and trapezoids
- **Constraints** — Spring, rope, pivot, and motor connections between bodies
- **Body Property Editor** — Set initial velocity (m/s), mass (kg), friction, restitution, and angle for each body
- **Gravity Modes** — Toggle between Earth (1g), Moon (0.16g), and Zero-g environments
- **Real-Time Analytics** — Live charts for velocity, speed, acceleration, and kinetic energy (SI units)
- **Multiplayer** — Real-time collaboration via Socket.IO with cursor sync and body synchronization
- **Experiment Save/Load** — Persist experiments to MongoDB and reload them later
- **Undo/Redo** — Command-pattern based undo/redo for all canvas operations
- **Google OAuth** — Sign in with Google or email/password authentication
- **Responsive UI** — Dark-themed, Figma-like interface with glassmorphism design

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 3, Zustand, Recharts |
| **Physics** | Matter.js 0.20 |
| **Backend** | Node.js, Express 4, Socket.IO 4 |
| **Database** | MongoDB (Mongoose 8) |
| **Auth** | JWT + Google OAuth (Google Identity Services) |
| **Realtime** | Socket.IO (WebSocket) |

---

## 📁 Project Structure

```
CVM++/
├── backend/               # Express + Socket.IO server
│   ├── src/
│   │   ├── config/        # Database connection
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── models/        # Mongoose schemas (User, Experiment)
│   │   ├── routes/        # REST API routes (auth, experiments)
│   │   ├── socket/        # Socket.IO event handlers
│   │   └── server.js      # Entry point
│   ├── .env.example       # Environment variables template
│   └── package.json
├── frontend/              # React + Vite client
│   ├── src/
│   │   ├── components/    # UI components (canvas, toolbar, analytics)
│   │   ├── hooks/         # Custom hooks (physics, socket, analytics)
│   │   ├── pages/         # Route pages (Landing, Lab, Login, Dashboard)
│   │   ├── services/      # API client, physics engine, socket service
│   │   ├── stores/        # Zustand state stores
│   │   └── utils/         # Unit conversion utilities
│   ├── .env.example       # Environment variables template
│   └── package.json
└── shared/                # Shared types & event constants
    ├── types.ts
    └── events.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **MongoDB** — Either a local instance or a [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster
- **Google OAuth Client ID** _(optional, for Google Sign-In)_

### 1. Clone the Repository

```bash
git clone https://github.com/aquib6010/VirtualLab.git
cd VirtualLab
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/virtual-lab
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4. Setup Google OAuth _(optional)_

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add your frontend URL to **Authorized JavaScript origins**:
   - `http://localhost:5173` (or whichever port Vite uses)
4. Copy the Client ID into both `backend/.env` and `frontend/.env`

> If you skip this step, the app will still work with email/password auth — the Google button simply won't appear.

### 5. Run the Application

**Terminal 1 — Backend:**

```bash
cd backend
npm start
# or for hot-reload:
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The app will be available at **http://localhost:5173** (Vite may pick a different port if 5173 is busy — check the terminal output).

---

## 🎮 Usage

1. **Open the Lab** — Navigate to `/lab` or click "Launch Lab" on the landing page
2. **Add Bodies** — Select a shape tool (Box, Circle, Ramp) from the left toolbar, then click on the canvas
3. **Edit Properties** — Click a body to select it, then modify velocity, mass, friction, etc. in the property editor
4. **Add Constraints** — Select a constraint tool (Spring, Rope, Pivot), click the source body, then click the target body
5. **Simulate** — Press Space or click Play to start the physics simulation
6. **Analyze** — Track a body's real-time velocity, acceleration, and kinetic energy in the right analytics panel
7. **Save** — Click "Save Experiment" to persist your setup to the database

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause simulation |
| `R` | Reset simulation |
| `1` | Select tool |
| `2` | Rectangle tool |
| `3` | Circle tool |
| `4` | Trapezoid tool |
| `Delete` | Delete selected body |
| `Escape` | Deselect / Switch to Select tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register with email/password |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/google` | Sign in with Google OAuth |
| `GET` | `/api/auth/me` | Get current user (requires JWT) |

### Experiments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/experiments` | List user's experiments |
| `GET` | `/api/experiments/public` | List public experiments |
| `GET` | `/api/experiments/:id` | Get experiment by ID |
| `POST` | `/api/experiments` | Create experiment |
| `PUT` | `/api/experiments/:id` | Update experiment |
| `DELETE` | `/api/experiments/:id` | Delete experiment |

---

## 🛠️ Development

```bash
# Backend with hot-reload
cd backend && npm run dev

# Frontend with HMR
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

---

## 📄 License

This project is for educational purposes — built as part of a collaborative virtual lab initiative.
