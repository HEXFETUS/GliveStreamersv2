export interface Stream {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail_url: string | null;
  language: string;
  visibility: StreamVisibility;
  user_id: string;
  livekit_room_name: string;
  status: StreamStatus;
  is_live: boolean;
  viewer_count: number;
  peak_viewer_count: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  livekit_room_created_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StreamVisibility = 'public' | 'unlisted' | 'private';

export type StreamStatus =
  | 'draft'
  | 'ready'
  | 'starting'
  | 'live'
  | 'ending'
  | 'ended'
  | 'archived';

export type StreamLifecycleAction =
  | 'ready'
  | 'start'
  | 'live'
  | 'end'
  | 'ended'
  | 'archive';

export function getStreamStatus(stream: Stream): StreamStatus {
  if (stream.is_live) return 'live';
  return stream.status;
}

export interface CreateStreamInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail_url?: string | null;
  language?: string;
  visibility?: StreamVisibility;
}

export interface StreamWithToken extends Stream {
  token: string;
}

export interface UpdateStreamMetadataInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail_url?: string | null;
  language?: string;
  visibility?: StreamVisibility;
}

export interface StreamAnalytics {
  stream_id: string;
  status: StreamStatus;
  viewer_count: number;
  peak_viewer_count: number;
  unique_viewer_count: number;
  active_session_count: number;
  total_session_count: number;
  total_watch_time_seconds: number;
  average_watch_duration_seconds: number;
  session_duration_seconds: number | null;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
}

export interface StreamTransitionInput {
  action: StreamLifecycleAction;
}

export interface ViewerJoinInput {
  viewer_id?: string;
}

export interface ViewerJoinResponse {
  session_id: string;
  viewer_id: string;
  analytics: StreamAnalytics;
}

export interface ViewerLeaveInput {
  session_id?: string;
  viewer_id?: string;
}

export interface ViewerLeaveResponse {
  analytics: StreamAnalytics;
}
