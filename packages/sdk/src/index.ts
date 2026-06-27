// ── Types ──
export type {
  Stream,
  StreamVisibility,
  CreateStreamInput,
  StreamWithToken,
  UpdateStreamMetadataInput,
  StreamAnalytics,
  StreamLifecycleAction,
  StreamTransitionInput,
  ViewerJoinInput,
  ViewerJoinResponse,
  ViewerLeaveInput,
  ViewerLeaveResponse,
  User,
  AuthResponse,
  LoginInput,
  RegisterInput,
  StreamCategory,
  CreateStreamCategoryInput,
  UpdateStreamCategoryInput,
  LiveKitTokenOptions,
  LiveKitTokenResponse,
  RoomMetadata,
  ApiError,
  HealthCheck,
} from './types/index.js';

// ── API Client ──
export { GliveApiClient, GLive } from './client/index.js';
export type { GliveClientConfig } from './client/index.js';
export type {
  GLiveEventName,
  GLiveEventHandler,
  GLiveEventPayloads,
} from './events/index.js';

// ── LiveKit (re-exported from @glive/livekit) ──
export {
  connectToLiveKitRoom,
  makeParticipantIdentity,
  LiveKitRoom,
} from '@glive/livekit';
export type { Room, RoomConnectOptions, RoomEvent } from '@glive/livekit';

// ── Auth ──
export { getStoredToken, storeToken, clearToken, decodeTokenPayload } from './auth/index.js';
