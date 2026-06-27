import { Router, type Router as RouterType } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { config } from '../config/index.js';

const router: RouterType = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userSelect = 'id, email, name, avatar_url, created_at';

interface TempUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  password_hash: string;
}

const tempUsersByEmail = new Map<string, TempUser>();
const tempUsersById = new Map<string, TempUser>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isDevTempAuthAllowed() {
  return config.nodeEnv !== 'production' && config.enableTempAuth;
}

function hasPostgresCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === code,
  );
}

function isPermissionDenied(error: unknown) {
  return hasPostgresCode(error, '42501');
}

async function createTempAccount(email: string, password: string, name: string) {
  const existingUser = tempUsersByEmail.get(email);
  if (existingUser) {
    return { user: existingUser, alreadyExists: true };
  }

  const user: TempUser = {
    id: `temp_${randomUUID()}`,
    email,
    name,
    avatar_url: null,
    created_at: new Date().toISOString(),
    password_hash: await bcrypt.hash(password, 12),
  };

  tempUsersByEmail.set(email, user);
  tempUsersById.set(user.id, user);

  return { user, alreadyExists: false };
}

function safeTempUser(user: TempUser) {
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { password, name } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!isSupabaseConfigured()) {
      if (!isDevTempAuthAllowed()) {
        res.status(503).json({ error: 'Supabase is not configured' });
        return;
      }

      const { user, alreadyExists } = await createTempAccount(email, password, name);
      if (alreadyExists) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      const token = signToken({ sub: user.id, email: user.email });
      res.status(201).json({ user: safeTempUser(user), token, temporary: true });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, name })
      .select(userSelect)
      .single();

    if (error) {
      if (hasPostgresCode(error, '23505')) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      if (isPermissionDenied(error) && isDevTempAuthAllowed()) {
        console.warn('Register using temporary dev account because Supabase denied access.');
        const { user, alreadyExists } = await createTempAccount(email, password, name);
        if (alreadyExists) {
          res.status(409).json({ error: 'User already exists' });
          return;
        }

        const token = signToken({ sub: user.id, email: user.email });
        res.status(201).json({ user: safeTempUser(user), token, temporary: true });
        return;
      }

      console.error('Register database error:', error);
      res.status(500).json({ error: 'Failed to create account' });
      return;
    }

    const token = signToken({ sub: data.id, email: data.email });

    res.status(201).json({ user: data, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!isSupabaseConfigured()) {
      if (!isDevTempAuthAllowed()) {
        res.status(503).json({ error: 'Supabase is not configured' });
        return;
      }

      const tempUser = tempUsersByEmail.get(email);
      if (!tempUser || !(await bcrypt.compare(password, tempUser.password_hash))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = signToken({ sub: tempUser.id, email: tempUser.email });
      res.json({ user: safeTempUser(tempUser), token, temporary: true });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, created_at, password_hash')
      .eq('email', email)
      .single();

    if (error) {
      if (isPermissionDenied(error) && isDevTempAuthAllowed()) {
        console.warn('Login using temporary dev account because Supabase denied access.');
        const tempUser = tempUsersByEmail.get(email);
        if (!tempUser || !(await bcrypt.compare(password, tempUser.password_hash))) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        const token = signToken({ sub: tempUser.id, email: tempUser.email });
        res.json({ user: safeTempUser(tempUser), token, temporary: true });
        return;
      }

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email });

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    if (req.user!.sub.startsWith('temp_') && isDevTempAuthAllowed()) {
      const tempUser = tempUsersById.get(req.user!.sub);
      if (!tempUser) {
        res.status(404).json({ error: 'Temporary user expired; create it again' });
        return;
      }

      res.json({ user: safeTempUser(tempUser), temporary: true });
      return;
    }

    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Supabase is not configured' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(userSelect)
      .eq('id', req.user!.sub)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
