# Glive Streamer — Live Streaming Platform

A real-time live streaming app built with **React + LiveKit** (frontend) and **Express + LiveKit Server SDK** (backend). Viewers can watch streams and send emoji reactions and dance animations to the streamer in real time.

## Architecture

| Component    | Tech Stack                               | Host          |
| ------------ | ---------------------------------------- | ------------- |
| **Frontend** | React, TypeScript, Vite, LiveKit SDK     | Vercel        |
| **Backend**  | Express.js, LiveKit Server SDK, Supabase | Render        |
| **LiveKit**  | LiveKit Cloud (WebRTC infrastructure)    | livekit.cloud |
| **Auth**     | Demo mode (in-memory) or Supabase        | Optional      |

---

## Prerequisites

Before deploying, you'll need accounts for:

1. **GitHub** — to host the code
2. **LiveKit Cloud** — for WebRTC streaming infrastructure
3. **Vercel** — for hosting the frontend (free tier)
4. **Render** — for hosting the backend (free tier)
5. **Supabase** _(optional)_ — only if you want real user authentication

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
| `SUPABASE_URL`       | Supabase project URL         | ❌ No\*  |
| `SUPABASE_ANON_KEY`  | Supabase anonymous key       | ❌ No\*  |
| `PORT`               | Backend port (default: 3001) | ❌ No    |

_\*Leave empty to use demo auth (in-memory users). No Supabase needed to get started._

---

## Step 1: Deploy the Backend (Render)

1. Push your code to a **GitHub repository**.

2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + → Web Service**.

3. Connect your GitHub repository.

4. Configure the service:

   | Setting           | Value                                        |
   | ----------------- | -------------------------------------------- |
   | **Name**          | `glivestreamer-backend`                      |
   | **Region**        | Choose closest to you                        |
   | **Branch**        | `main`                                       |
   | **Runtime**       | `Node`                                       |
   | **Build Command** | `cd backend && npm install && npm run build` |
   | **Start Command** | `cd backend && npm start`                    |
   | **Plan**          | Free                                         |

5. Add the **Environment Variables**:

   | Key                  | Value                                                     |
   | -------------------- | --------------------------------------------------------- |
   | `NODE_ENV`           | `production`                                              |
   | `LIVEKIT_URL`        | `wss://your-project.livekit.cloud` (use your LiveKit URL) |
   | `LIVEKIT_API_KEY`    | _(from LiveKit Cloud settings)_                           |
   | `LIVEKIT_API_SECRET` | _(from LiveKit Cloud settings)_                           |
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

## Step 2: Deploy the Frontend (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New → Project**.

2. Import your GitHub repository.

3. Configure the project:

   | Setting              | Value               |
   | -------------------- | ------------------- |
   | **Framework Preset** | `Vite`              |
   | **Root Directory**   | `./` (project root) |
   | **Build Command**    | `npm run build`     |
   | **Output Directory** | `dist`              |

4. Add **Environment Variables**:

   | Key                | Value                                             |
   | ------------------ | ------------------------------------------------- |
   | `VITE_API_BASE`    | `https://your-app.onrender.com` (your Render URL) |
   | `VITE_LIVEKIT_URL` | `wss://your-project.livekit.cloud`                |

5. Click **Deploy**.

6. After deployment, Vercel gives you a URL like `https://glivestreamer.vercel.app`.

---

## Demo Accounts

With demo auth (no Supabase), you can log in using:

| Email                | Password  | Name          |
| -------------------- | --------- | ------------- |
| `demo@streampoc.com` | `demo123` | Demo Streamer |
| `test@streampoc.com` | `test123` | Test Streamer |

You can also **sign up** new accounts on the login page — they'll work until the backend restarts.

---

## LiveKit Cloud Setup

1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and create a project.
2. Go to **Settings → Keys** to find your:
   - `LIVEKIT_URL` (e.g., `wss://your-project.livekit.cloud`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Copy these values into both Render and Vercel environment variables.

---

## Local Development

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your LiveKit credentials
npm run dev
```

### 2. Frontend

```bash
# From project root
npm install
# Edit .env with your values
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API calls to the backend at `http://localhost:3001`.

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

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, LiveKit Components React
- **Backend:** Express.js, LiveKit Server SDK, Supabase JS
- **Streaming:** LiveKit Cloud (WebRTC)
