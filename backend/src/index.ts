import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const isSupabaseConfigured = supabaseUrl !== 'your_supabase_project_url' && supabaseUrl !== '';

// Initialize LiveKit RoomServiceClient (used to list active rooms)
const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL || '',
  process.env.LIVEKIT_API_KEY || '',
  process.env.LIVEKIT_API_SECRET || ''
);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// ---------- Auth endpoints ----------

// Demo users for when Supabase is not configured
const DEMO_USERS: Record<string, { password: string; name: string }> = {
  'demo@streampoc.com': { password: 'demo123', name: 'Demo Streamer' },
  'test@streampoc.com': { password: 'test123', name: 'Test Streamer' },
};

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isSupabaseConfigured) {
      // Demo mode: check if user already exists in our demo list
      if (DEMO_USERS[email]) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      // Create demo user in-memory (volatile, for demo purposes only)
      DEMO_USERS[email] = { password, name: name || email.split('@')[0] };
      return res.json({
        user: {
          id: `demo-${Date.now()}`,
          email,
          name: name || email.split('@')[0],
        },
        token: `demo-token-${Buffer.from(email).toString('base64')}`,
      });
    }

    // Real Supabase signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name || email.split('@')[0],
      },
      token: data.session?.access_token,
    });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (isSupabaseConfigured) {
      // Try Supabase first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        return res.json({
          user: {
            id: data.user?.id,
            email: data.user?.email,
            name: data.user?.user_metadata?.name || email.split('@')[0],
          },
          token: data.session?.access_token,
        });
      }
    }

    // Fallback to demo/in-memory users
    const demoUser = DEMO_USERS[email];
    if (!demoUser || demoUser.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = `demo-token-${Buffer.from(email).toString('base64')}`;

    return res.json({
      user: {
        id: `demo-${Buffer.from(email).toString('base64')}`,
        email,
        name: demoUser.name,
      },
      token,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Get current user from token
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);

    // Check demo token
    if (token.startsWith('demo-token-')) {
      const email = Buffer.from(token.slice(11), 'base64').toString('utf-8');
      const demoUser = DEMO_USERS[email];
      if (!demoUser) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.json({
        user: {
          id: `demo-${Buffer.from(email).toString('base64')}`,
          email,
          name: demoUser.name,
        },
      });
    }

    // Real Supabase session check
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ---------- LiveKit endpoints ----------

// List active LiveKit rooms (live streams)
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await roomService.listRooms();
    // Return minimal info needed by the homepage
    const result = rooms.map((room) => {
      const parsedMetadata = room.metadata ? JSON.parse(room.metadata) : null
      return {
        name: room.name,
        participantCount: room.numParticipants,
        createdAt: typeof room.creationTime === 'bigint' ? Number(room.creationTime) : room.creationTime,
        metadata: parsedMetadata,
      }
    })
    res.json(result)
  } catch (error) {
    console.error('Error listing rooms:', error);
    // If LiveKit is unreachable, return empty list rather than crashing
    res.json([]);
  }
});

// List participants in a specific room
app.get('/api/rooms/:roomName/participants', async (req, res) => {
  try {
    const { roomName } = req.params;
    const participants = await roomService.listParticipants(roomName);
    const result = participants.map((p) => ({
      identity: p.identity,
      name: p.name,
      joinedAt: typeof p.joinedAt === 'bigint' ? Number(p.joinedAt) : p.joinedAt,
      metadata: p.metadata ? JSON.parse(p.metadata) : null,
    }));
    res.json(result);
  } catch (error) {
    console.error('Error listing participants:', error);
    res.status(500).json({ error: 'Failed to list participants' });
  }
});

// Generate LiveKit token
app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName, metadata } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName are required' });
    }

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY || '',
      process.env.LIVEKIT_API_SECRET || '',
      {
        identity: participantName,
        metadata: metadata || '',
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
    });

    const jwt = await token.toJwt();

    res.json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Example Supabase endpoint
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

const port = Number(PORT);
app.listen(port, '0.0.0.0', () => {
  const ifaces = Object.values(os.networkInterfaces()).flat() as os.NetworkInterfaceInfo[];
  const ip = ifaces.find((i) => i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Network:  http://${ip}:${port}`);
  console.log(`Supabase: ${isSupabaseConfigured ? 'configured' : 'not configured (using demo auth)'}`);
});
