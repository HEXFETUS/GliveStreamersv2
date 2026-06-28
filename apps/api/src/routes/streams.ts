import { Router, type Router as RouterType } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authenticate, type AuthPayload } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createLiveKitToken,
  ensureLiveKitRoom,
  isLiveKitConfigured,
  roomService,
} from '../lib/livekit.js';
import { supabase } from '../lib/supabase.js';

const router: RouterType = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  category: z.string().max(100).optional().default(''),
  tags: z.array(z.string().min(1).max(40)).max(20).optional().default([]),
  thumbnail_url: z.string().url().nullable().optional().default(null),
  language: z.string().min(2).max(16).optional().default('en'),
  visibility: z.enum(['public', 'unlisted', 'private']).optional().default('public'),
});

const updateMetadataSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  language: z.string().min(2).max(16).optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
});

const transitionSchema = z.object({
  action: z.enum(['ready', 'start', 'live', 'end', 'ended', 'archive']),
});

const viewerJoinSchema = z.object({
  viewer_id: z.string().min(1).max(160).optional(),
});

const viewerLeaveSchema = z.object({
  session_id: z.string().uuid().optional(),
  viewer_id: z.string().min(1).max(160).optional(),
});

const streamSelect =
  'id, title, description, category, tags, thumbnail_url, language, visibility, user_id, livekit_room_name, status, is_live, viewer_count, peak_viewer_count, duration_seconds, started_at, ended_at, livekit_room_created_at, created_at, updated_at';

type StreamStatus =
  | 'draft'
  | 'ready'
  | 'starting'
  | 'live'
  | 'ending'
  | 'ended'
  | 'archived';

type StreamLifecycleAction =
  | 'ready'
  | 'start'
  | 'live'
  | 'end'
  | 'ended'
  | 'archive';

const lifecycleTransitions: Record<
  StreamLifecycleAction,
  { from: StreamStatus[]; to: StreamStatus }
> = {
  ready: { from: ['draft', 'starting'], to: 'ready' },
  start: { from: ['ready', 'ended'], to: 'starting' },
  live: { from: ['starting'], to: 'live' },
  end: { from: ['live'], to: 'ending' },
  ended: { from: ['ending'], to: 'ended' },
  archive: { from: ['ended'], to: 'archived' },
};

function publisherIdentity(userId: string) {
  return `publisher_${userId}`;
}

function viewerIdentity() {
  return `viewer_${randomUUID()}`;
}

function durationSeconds(startedAt?: string | null, endedAt?: string | null) {
  if (!startedAt) return 0;

  const startMs = new Date(startedAt).getTime();
  const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();

  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

async function streamAnalytics(stream: {
  id: string;
  status: StreamStatus;
  viewer_count: number;
  peak_viewer_count: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
}, sessionId?: string | null) {
  const { data: sessions, error } = await supabase
    .from('stream_viewer_sessions')
    .select('id, viewer_key, joined_at, left_at, duration_seconds')
    .eq('stream_id', stream.id);

  if (error) {
    throw error;
  }

  const now = Date.now();
  const rows = sessions ?? [];
  const activeSessions = rows.filter((session) => !session.left_at);
  const totalWatchTimeSeconds = rows.reduce((sum, session) => {
    if (!session.left_at) {
      return sum + durationSeconds(session.joined_at);
    }

    return sum + session.duration_seconds;
  }, 0);
  const selectedSession = sessionId
    ? rows.find((session) => session.id === sessionId)
    : null;
  const sessionDurationSeconds = selectedSession
    ? selectedSession.left_at
      ? selectedSession.duration_seconds
      : Math.max(
          0,
          Math.floor((now - new Date(selectedSession.joined_at).getTime()) / 1000),
        )
    : null;

  return {
    stream_id: stream.id,
    status: stream.status,
    viewer_count: activeSessions.length,
    peak_viewer_count: Math.max(stream.peak_viewer_count, activeSessions.length),
    unique_viewer_count: new Set(rows.map((session) => session.viewer_key)).size,
    active_session_count: activeSessions.length,
    total_session_count: rows.length,
    total_watch_time_seconds: totalWatchTimeSeconds,
    average_watch_duration_seconds: rows.length > 0
      ? Math.floor(totalWatchTimeSeconds / rows.length)
      : 0,
    session_duration_seconds: sessionDurationSeconds,
    duration_seconds: stream.status === 'live'
      ? durationSeconds(stream.started_at)
      : stream.duration_seconds,
    started_at: stream.started_at,
    ended_at: stream.ended_at,
  };
}

function canTransition(status: StreamStatus, action: StreamLifecycleAction) {
  return lifecycleTransitions[action].from.includes(status);
}

function transitionError(status: StreamStatus, action: StreamLifecycleAction) {
  const allowed = lifecycleTransitions[action].from.join(', ');
  return `Cannot ${action} a ${status} stream. Expected one of: ${allowed}`;
}

function isWatchableStatus(status: StreamStatus) {
  return status === 'live' || status === 'ending';
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function normalizeViewerKey(viewerId?: string) {
  return viewerId?.trim() || `viewer_${randomUUID()}`;
}

async function resetViewerSessions(streamId: string) {
  await supabase
    .from('stream_viewer_sessions')
    .delete()
    .eq('stream_id', streamId);
}

async function closeActiveViewerSessions(streamId: string, leftAt: string) {
  const { data: sessions, error } = await supabase
    .from('stream_viewer_sessions')
    .select('id, joined_at')
    .eq('stream_id', streamId)
    .is('left_at', null);

  if (error) {
    throw error;
  }

  await Promise.all(
    (sessions ?? []).map((session) =>
      supabase
        .from('stream_viewer_sessions')
        .update({
          left_at: leftAt,
          duration_seconds: durationSeconds(session.joined_at, leftAt),
        })
        .eq('id', session.id),
    ),
  );
}

router.post('/', authenticate, validate(createStreamSchema), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      tags,
      thumbnail_url,
      language,
      visibility,
    } = req.body;
    const userId = req.user!.sub;
    const roomName = randomUUID();

    const { data: stream, error } = await supabase
      .from('streams')
      .insert({
        title,
        description,
        category,
        tags: normalizeTags(tags),
        thumbnail_url,
        language: language.trim().toLowerCase(),
        visibility,
        user_id: userId,
        livekit_room_name: roomName,
        status: 'draft',
        is_live: false,
      })
      .select(streamSelect)
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create stream' });
      return;
    }

    const roomCreated = await ensureLiveKitRoom(roomName, {
      streamId: stream.id,
      title: stream.title,
      userId,
    });

    const updatedStream = roomCreated
      ? {
          ...stream,
          livekit_room_created_at:
            stream.livekit_room_created_at ?? new Date().toISOString(),
        }
      : stream;

    if (roomCreated && !stream.livekit_room_created_at) {
      await supabase
        .from('streams')
        .update({ livekit_room_created_at: updatedStream.livekit_room_created_at })
        .eq('id', stream.id)
        .eq('user_id', userId);
    }

    const token = createLiveKitToken(publisherIdentity(userId), roomName, {
      canPublish: true,
      canSubscribe: true,
    });

    res.status(201).json({ ...updatedStream, token });
  } catch (err) {
    console.error('Create stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(
  '/:streamId/metadata',
  authenticate,
  validate(updateMetadataSchema),
  async (req, res) => {
    try {
      const { streamId } = req.params;
      const updates: Record<string, unknown> = {};

      for (const field of [
        'title',
        'description',
        'category',
        'thumbnail_url',
        'visibility',
      ]) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }

      if ('tags' in req.body) {
        updates.tags = normalizeTags(req.body.tags);
      }

      if ('language' in req.body) {
        updates.language = req.body.language.trim().toLowerCase();
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No metadata fields provided' });
        return;
      }

      const { data: stream, error } = await supabase
        .from('streams')
        .update(updates)
        .eq('id', streamId)
        .eq('user_id', req.user!.sub)
        .select(streamSelect)
        .single();

      if (error || !stream) {
        res.status(404).json({ error: 'Stream not found' });
        return;
      }

      res.json({ stream });
    } catch (err) {
      console.error('Update metadata error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.get('/:streamId/token', async (req, res) => {
  try {
    const { streamId } = req.params;
    const user = req.user as AuthPayload | undefined;

    const { data: stream, error } = await supabase
      .from('streams')
      .select('id, livekit_room_name, status, is_live')
      .eq('id', streamId)
      .single();

    if (error || !stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    if (!isWatchableStatus(stream.status as StreamStatus)) {
      res.status(409).json({ error: 'Stream is not live' });
      return;
    }

    const identity = user ? `viewer_${user.sub}` : viewerIdentity();

    const token = createLiveKitToken(identity, stream.livekit_room_name, {
      canPublish: false,
      canSubscribe: true,
    });

    res.json({
      token,
      identity,
      room: stream.livekit_room_name,
      canPublish: false,
      canSubscribe: true,
    });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:streamId/publisher-token', authenticate, async (req, res) => {
  try {
    const { streamId } = req.params;

    const { data: stream, error } = await supabase
      .from('streams')
      .select('id, title, user_id, livekit_room_name, status')
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .single();

    if (error || !stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    if (stream.status === 'draft' || stream.status === 'archived') {
      res.status(409).json({
        error: `Publisher token is not available for ${stream.status} streams`,
      });
      return;
    }

    await ensureLiveKitRoom(stream.livekit_room_name, {
      streamId: stream.id,
      title: stream.title,
      userId: stream.user_id,
    });

    const identity = publisherIdentity(req.user!.sub);
    const token = createLiveKitToken(identity, stream.livekit_room_name, {
      canPublish: true,
      canSubscribe: true,
    });

    res.json({
      token,
      identity,
      room: stream.livekit_room_name,
      canPublish: true,
      canSubscribe: true,
    });
  } catch (err) {
    console.error('Publisher token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:streamId/analytics', async (req, res) => {
  try {
    const { streamId } = req.params;

    const { data: stream, error } = await supabase
      .from('streams')
      .select(streamSelect)
      .eq('id', streamId)
      .single();

    if (error || !stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    res.json({ analytics: await streamAnalytics(stream) });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/:streamId/transition',
  authenticate,
  validate(transitionSchema),
  async (req, res) => {
    try {
      const { streamId } = req.params;
      const action = req.body.action as StreamLifecycleAction;

      const { data: existingStream, error: findError } = await supabase
        .from('streams')
        .select(streamSelect)
        .eq('id', streamId)
        .eq('user_id', req.user!.sub)
        .single();

      if (findError || !existingStream) {
        res.status(404).json({ error: 'Stream not found' });
        return;
      }

      const currentStatus = existingStream.status as StreamStatus;
      if (!canTransition(currentStatus, action)) {
        res.status(409).json({ error: transitionError(currentStatus, action) });
        return;
      }

      const nextStatus = lifecycleTransitions[action].to;
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = {
        status: nextStatus,
        is_live: nextStatus === 'live',
      };

      if (nextStatus === 'starting') {
        await resetViewerSessions(streamId);
        updates.viewer_count = 0;
        updates.peak_viewer_count = 0;
        updates.duration_seconds = 0;
        updates.started_at = null;
        updates.ended_at = null;
      }

      if (nextStatus === 'ready') {
        updates.is_live = false;
        updates.started_at = null;
        updates.ended_at = null;
      }

      if (nextStatus === 'live') {
        updates.is_live = true;
        updates.started_at = existingStream.started_at ?? now;
        updates.ended_at = null;
      }

      if (nextStatus === 'ending') {
        updates.is_live = false;
        updates.viewer_count = 0;
      }

      if (nextStatus === 'ended') {
        await closeActiveViewerSessions(streamId, now);
        updates.is_live = false;
        updates.viewer_count = 0;
        updates.ended_at = now;
        updates.duration_seconds = durationSeconds(existingStream.started_at, now);
      }

      if (nextStatus === 'archived') {
        updates.is_live = false;
        updates.viewer_count = 0;
      }

      const { data: stream, error } = await supabase
        .from('streams')
        .update(updates)
        .eq('id', streamId)
        .eq('user_id', req.user!.sub)
        .select(streamSelect)
        .single();

      if (error || !stream) {
        res.status(500).json({ error: 'Failed to transition stream' });
        return;
      }

      res.json({ stream });
    } catch (err) {
      console.error('Transition stream error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/:streamId/viewers/join',
  validate(viewerJoinSchema),
  async (req, res) => {
    try {
      const { streamId } = req.params;

      const { data: existingStream, error: findError } = await supabase
        .from('streams')
        .select(streamSelect)
        .eq('id', streamId)
        .single();

      if (findError || !existingStream) {
        res.status(404).json({ error: 'Stream not found' });
        return;
      }

      if (!isWatchableStatus(existingStream.status as StreamStatus)) {
        res.status(409).json({ error: 'Stream is not live' });
        return;
      }

      const viewerKey = normalizeViewerKey(req.body.viewer_id);
      const { data: session, error: sessionError } = await supabase
        .from('stream_viewer_sessions')
        .insert({
          stream_id: streamId,
          viewer_key: viewerKey,
        })
        .select('id, viewer_key')
        .single();

      if (sessionError || !session) {
        res.status(500).json({ error: 'Failed to create viewer session' });
        return;
      }

      const analytics = await streamAnalytics(existingStream, session.id);
      const viewerCount = analytics.viewer_count;
      const peakViewerCount = Math.max(
        existingStream.peak_viewer_count,
        viewerCount,
      );

      const { data: stream, error } = await supabase
        .from('streams')
        .update({
          viewer_count: viewerCount,
          peak_viewer_count: peakViewerCount,
        })
        .eq('id', streamId)
        .select(streamSelect)
        .single();

      if (error || !stream) {
        res.status(500).json({ error: 'Failed to update viewer count' });
        return;
      }

      res.json({
        session_id: session.id,
        viewer_id: session.viewer_key,
        analytics: await streamAnalytics(stream, session.id),
      });
    } catch (err) {
      console.error('Viewer join error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/:streamId/viewers/leave',
  validate(viewerLeaveSchema),
  async (req, res) => {
    try {
      const { streamId } = req.params;

      const { data: existingStream, error: findError } = await supabase
        .from('streams')
        .select(streamSelect)
        .eq('id', streamId)
        .single();

      if (findError || !existingStream) {
        res.status(404).json({ error: 'Stream not found' });
        return;
      }

      const sessionQuery = supabase
        .from('stream_viewer_sessions')
        .select('id, joined_at, left_at')
        .eq('stream_id', streamId)
        .is('left_at', null)
        .order('joined_at', { ascending: false })
        .limit(1);

      const { data: sessions, error: sessionFindError } = req.body.session_id
        ? await sessionQuery.eq('id', req.body.session_id)
        : req.body.viewer_id
          ? await sessionQuery.eq('viewer_key', req.body.viewer_id)
          : await sessionQuery;

      if (sessionFindError) {
        res.status(500).json({ error: 'Failed to find viewer session' });
        return;
      }

      const session = sessions?.[0];
      if (session) {
        const leftAt = new Date().toISOString();
        const duration = durationSeconds(session.joined_at, leftAt);
        const { error: closeError } = await supabase
          .from('stream_viewer_sessions')
          .update({
            left_at: leftAt,
            duration_seconds: duration,
          })
          .eq('id', session.id);

        if (closeError) {
          res.status(500).json({ error: 'Failed to close viewer session' });
          return;
        }
      }

      const analytics = await streamAnalytics(existingStream, session?.id ?? null);

      const { data: stream, error } = await supabase
        .from('streams')
        .update({
          viewer_count: analytics.viewer_count,
          peak_viewer_count: Math.max(
            existingStream.peak_viewer_count,
            analytics.viewer_count,
          ),
        })
        .eq('id', streamId)
        .select(streamSelect)
        .single();

      if (error || !stream) {
        res.status(500).json({ error: 'Failed to update viewer count' });
        return;
      }

      res.json({
        analytics: await streamAnalytics(stream, session?.id ?? null),
      });
    } catch (err) {
      console.error('Viewer leave error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.delete('/:streamId', authenticate, async (req, res) => {
  try {
    const { streamId } = req.params;

    const { data: stream } = await supabase
      .from('streams')
      .select('livekit_room_name')
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .single();

    if (stream && isLiveKitConfigured()) {
      await roomService.deleteRoom(stream.livekit_room_name);
    }

    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId)
      .eq('user_id', req.user!.sub);

    if (error) {
      res.status(500).json({ error: 'Failed to delete stream' });
      return;
    }

    res.json({ message: 'Stream deleted' });
  } catch (err) {
    console.error('Delete stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:streamId/start', authenticate, async (req, res) => {
  try {
    const { streamId } = req.params;

    const { data: existingStream, error: findError } = await supabase
      .from('streams')
      .select('id, title, user_id, livekit_room_name, status, livekit_room_created_at')
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .single();

    if (findError || !existingStream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const currentStatus = existingStream.status as StreamStatus;
    if (!canTransition(currentStatus, 'start')) {
      res.status(409).json({ error: transitionError(currentStatus, 'start') });
      return;
    }

    const roomCreated = await ensureLiveKitRoom(existingStream.livekit_room_name, {
      streamId: existingStream.id,
      title: existingStream.title,
      userId: existingStream.user_id,
    });
    await resetViewerSessions(streamId);

    const { data: stream, error } = await supabase
      .from('streams')
      .update({
        status: 'starting',
        is_live: false,
        viewer_count: 0,
        peak_viewer_count: 0,
        duration_seconds: 0,
        started_at: null,
        ended_at: null,
        livekit_room_created_at: roomCreated
          ? (existingStream.livekit_room_created_at ?? new Date().toISOString())
          : existingStream.livekit_room_created_at,
      })
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .select(streamSelect)
      .single();

    if (error || !stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const token = createLiveKitToken(
      publisherIdentity(req.user!.sub),
      stream.livekit_room_name,
      {
        canPublish: true,
        canSubscribe: true,
      },
    );

    res.json({ ...stream, token });
  } catch (err) {
    console.error('Start stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:streamId/stop', authenticate, async (req, res) => {
  try {
    const { streamId } = req.params;

    const { data: existingStream, error: findError } = await supabase
      .from('streams')
      .select('id, status, started_at')
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .single();

    if (findError || !existingStream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const currentStatus = existingStream.status as StreamStatus;
    if (!canTransition(currentStatus, 'end')) {
      res.status(409).json({ error: transitionError(currentStatus, 'end') });
      return;
    }

    const endedAt = new Date().toISOString();
    await closeActiveViewerSessions(streamId, endedAt);

    const { data: stream, error } = await supabase
      .from('streams')
      .update({
        status: 'ended',
        is_live: false,
        viewer_count: 0,
        ended_at: endedAt,
        duration_seconds: durationSeconds(existingStream.started_at, endedAt),
      })
      .eq('id', streamId)
      .eq('user_id', req.user!.sub)
      .select(streamSelect)
      .single();

    if (error || !stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    res.json({ stream });
  } catch (err) {
    console.error('Stop stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { data: streams, error } = await supabase
      .from('streams')
      .select(streamSelect)
      .eq('user_id', req.user!.sub)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch streams' });
      return;
    }

    res.json({ streams });
  } catch (err) {
    console.error('List streams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/public', async (_req, res) => {
  try {
    const { data: streams, error } = await supabase
      .from('streams')
      .select(streamSelect)
      .eq('is_live', true)
      .eq('visibility', 'public')
      .order('started_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch public streams' });
      return;
    }

    res.json({ streams });
  } catch (err) {
    console.error('Public list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
