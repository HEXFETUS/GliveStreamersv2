# Glive Streamer — Live Streaming Platform

A real-time live streaming app built with **React + LiveKit** (frontend) and **Express + LiveKit Server SDK** (backend). Viewers can watch streams, send emoji reactions with sound effects, trigger dance animations, and send virtual gifts to the streamer in real time over LiveKit data channels.

## Architecture

| Component    | Tech Stack                                                 | Host          |
| ------------ | ---------------------------------------------------------- | ------------- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, LiveKit SDK   | Vercel        |
| **Backend**  | Express.js, LiveKit Server SDK, Supabase, TypeScript (tsx) | Render        |
| **LiveKit**  | LiveKit Cloud (WebRTC infrastructure)                      | livekit.cloud |
| **Auth**     | Demo mode (in-memory) or Supabase                          | Optional      |

### Project Structure

```
streampoc-root/
├── package.json              # Root workspace — runs both frontend & backend
├── backend/                  # Express API server
│   ├── package.json
│   ├── render.yaml           # Render deployment config
│   ├── tsconfig.json
│   ├── .env / .env.example
│   └── src/index.ts          # API routes: auth, rooms, tokens
├── streampoc/                # React + Vite frontend
│   ├── package.json
│   ├── vercel.json           # Vercel deployment config
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx           # Router (home / login / dashboard / watch)
│   │   ├── WatchPage.tsx     # Live stream viewer with reactions, gifts, chat
│   │   ├── Dashboard.tsx     # Streamer dashboard
│   │   ├── HomePage.tsx      # Homepage listing active streams
│   │   ├── LoginPage.tsx     # Auth page
│   │   ├── sound.ts          # Audio playback utility
│   │   └── soundboard.ts     # Reaction → audio file mapping
│   └── public/audio/         # Reaction & dance sound effects (.wav / .mp3)
└── doc/
    └── README.md             # This file
```

---

## Prerequisites

Before deploying, you'll need:

- **pnpm** — package manager (install via `npm i -g pnpm`)
- **GitHub** — to host the code
- **LiveKit Cloud** — for WebRTC streaming infrastructure
- **Vercel** — for hosting the frontend (free tier)
- **Render** — for hosting the backend (free tier)
- **Supabase** _(optional)_ — only if you want real user authentication

---

## Features

| Feature              | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| **Live Streaming**   | Real-time WebRTC streaming via LiveKit Cloud                             |
| **Emoji Reactions**  | Viewers send floating emoji reactions that appear on the streamer's feed |
| **Reaction Sounds**  | Each emoji reaction triggers a unique sound effect (e.g., laugh, cry)    |
| **Dance Animations** | Viewers can trigger animated emoji dances (spin, bounce) with audio      |
| **Virtual Gifts**    | Gift system with tiered token costs (Like → Diamond)                     |
| **Live Chat**        | Comments overlay on the stream video (with mock comments)                |
| **Fullscreen**       | Fullscreen/browser-maximize toggle with mobile support                   |
| **Demo Auth**        | Built-in demo accounts — no database required to get started             |
| **Supabase Auth**    | Optional real authentication with Supabase                               |
| **Responsive UI**    | Works on mobile, tablet, laptop, and desktop                             |

---

## Environment Variables

### Frontend (`VITE_*` — set in Vercel)

| Variable           | Description                 | Example                            |
| ------------------ | --------------------------- | ---------------------------------- |
| `VITE_API_BASE`    | URL of the deployed backend | `https://your-app.onrender.com`    |
| `VITE_LIVEKIT_URL` | LiveKit Cloud WebSocket URL | `wss://your-project.livekit.cloud` |

### Backend (set in Render)

| Variable             | Description                  | Required |
| -------------------- | ---------------------------- | -------- |
| `LIVEKIT_URL`        | LiveKit Cloud WebSocket URL  | ✅ Yes   |
| `LIVEKIT_API_KEY`    | LiveKit API key              | ✅ Yes   |
| `LIVEKIT_API_SECRET` | LiveKit API secret           | ✅ Yes   |
| `CORS_ORIGIN`        | Frontend URL(s) for CORS     | ✅ Yes   |
| `SUPABASE_URL`       | Supabase project URL         | ❌ No\*  |
| `SUPABASE_ANON_KEY`  | Supabase anonymous key       | ❌ No\*  |
| `PORT`               | Backend port (default: 3001) | ❌ No    |
| `NODE_ENV`           | Set automatically by Render  | ❌ No    |

_\*Leave empty to use demo auth (in-memory users). No Supabase needed to get started._

---

## Step 1: Set Up LiveKit Cloud

1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and create a project.
2. Go to **Settings → Keys** to find your:
   - `LIVEKIT_URL` (e.g., `wss://your-project.livekit.cloud`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Save these values — you'll need them in Steps 2 and 3.

---

## Step 2: Deploy the Backend (Render)

1. Push your code to a **GitHub repository**.

2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + → Web Service**.

3. Connect your GitHub repository.

4. Configure the service:

   | Setting            | Value                        |
   | ------------------ | ---------------------------- |
   | **Name**           | `glivestreamer-backend`      |
   | **Region**         | Choose closest to you        |
   | **Branch**         | `main`                       |
   | **Runtime**        | `Node`                       |
   | **Root Directory** | `backend`                    |
   | **Build Command**  | `pnpm install && pnpm build` |
   | **Start Command**  | `pnpm start`                 |
   | **Plan**           | Free                         |

5. Add the **Environment Variables**:

   | Key                  | Value                                                     |
   | -------------------- | --------------------------------------------------------- |
   | `NODE_ENV`           | `production`                                              |
   | `LIVEKIT_URL`        | `wss://your-project.livekit.cloud` (use your LiveKit URL) |
   | `LIVEKIT_API_KEY`    | _(from LiveKit Cloud settings)_                           |
   | `LIVEKIT_API_SECRET` | _(from LiveKit Cloud settings)_                           |
   | `CORS_ORIGIN`        | `https://your-vercel-app.vercel.app` (set after Step 3)   |
   | `PORT`               | `3001` _(Render will override this automatically)_        |

   > **Note:** Leave `SUPABASE_URL` and `SUPABASE_ANON_KEY` empty for demo auth.

6. Click **Deploy**.

7. After deployment completes, copy your Render URL (e.g., `https://glivestreamer-backend.onrender.com`). You'll need it for the frontend.

### Verify the backend is running

Visit `https://your-app.onrender.com/health` — you should see:

```json
{ "status": "ok", "message": "Backend is running" }
```

---

## Step 3: Deploy the Frontend (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New → Project**.

2. Import your GitHub repository.

3. Configure the project:

   | Setting              | Value        |
   | -------------------- | ------------ |
   | **Framework Preset** | `Vite`       |
   | **Root Directory**   | `streampoc`  |
   | **Build Command**    | `pnpm build` |
   | **Output Directory** | `dist`       |

4. Add **Environment Variables**:

   | Key                | Value                                             |
   | ------------------ | ------------------------------------------------- |
   | `VITE_API_BASE`    | `https://your-app.onrender.com` (your Render URL) |
   | `VITE_LIVEKIT_URL` | `wss://your-project.livekit.cloud`                |

5. Click **Deploy**.

6. After deployment, Vercel gives you a URL like `https://glivestreamer.vercel.app`.

7. **Go back to Render** and update the `CORS_ORIGIN` environment variable to your Vercel URL (e.g., `https://glivestreamer.vercel.app`). This tells the backend to accept requests from your frontend.

---

## Step 4: Update CORS (Important)

After both deployments are live:

1. Copy your Vercel URL (e.g., `https://glivestreamer.vercel.app`)
2. Go to **Render Dashboard → Environment** for your backend service
3. Set `CORS_ORIGIN` to your Vercel URL (for multiple domains, use commas: `https://site1.com,https://site2.com`)
4. Render will automatically redeploy

---

## Demo Accounts

With demo auth (no Supabase), you can log in using:

| Email                | Password  | Name          |
| -------------------- | --------- | ------------- |
| `demo@streampoc.com` | `demo123` | Demo Streamer |
| `test@streampoc.com` | `test123` | Test Streamer |

You can also **sign up** new accounts on the login page — they'll work until the backend restarts.

---

## Local Development

### Quick start (both frontend & backend)

From the project root, run:

```bash
pnpm install
pnpm dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently with hot reload.

### Backend only

```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env with your LiveKit credentials
pnpm dev
```

### Frontend only

```bash
cd streampoc
pnpm install
# Edit streampoc/.env with your values
pnpm dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API calls to the backend at `http://localhost:3001` (configured in `vite.config.ts`).

### Network access (testing on mobile/tablet)

To allow other devices on your network to access the dev server:

```bash
pnpm dev:host
```

This starts both services, with Vite exposed on `0.0.0.0`. Access from any device on the same network at `http://YOUR_LOCAL_IP:5173`.

### Production build (test locally)

```bash
pnpm build:all    # Build both frontend and backend
pnpm start        # Start the production server (serves API + frontend on port 3001)
```

---

## Project Scripts

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `pnpm dev`            | Dev mode (backend + frontend with HMR)        |
| `pnpm dev:host`       | Dev mode exposed on network                   |
| `pnpm build`          | Build frontend only                           |
| `pnpm build:all`      | Build both frontend and backend               |
| `pnpm build:frontend` | Build frontend only (alias)                   |
| `pnpm build:backend`  | Build backend only                            |
| `pnpm start`          | Production start (single server on port 3001) |
| `pnpm lint`           | Lint frontend                                 |
| `pnpm preview`        | Preview frontend build locally                |

---

## Using Supabase (Optional)

If you want real user accounts instead of demo auth:

1. Create a project at [Supabase](https://supabase.com/).
2. Copy your **Project URL** and **anon public key** from **Settings → API**.
3. Add these as environment variables in Render:

   | Key                 | Value                              |
   | ------------------- | ---------------------------------- |
   | `SUPABASE_URL`      | `https://your-project.supabase.co` |
   | `SUPABASE_ANON_KEY` | _(anon public key)_                |

4. Redeploy the backend on Render.

---

## LiveKit Cloud Setup

1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and create a project.
2. Go to **Settings → Keys** to find your:
   - `LIVEKIT_URL` (e.g., `wss://your-project.livekit.cloud`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Copy these values into both Render and Vercel environment variables.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, LiveKit Components React
- **Backend:** Express.js, LiveKit Server SDK, Supabase JS, tsx (TypeScript runner)
- **Audio:** HTML5 Audio API with caching
- **Streaming:** LiveKit Cloud (WebRTC), Data Channel (reactions & dance sync)
- **Deployment:** Vercel (frontend) + Render (backend)
