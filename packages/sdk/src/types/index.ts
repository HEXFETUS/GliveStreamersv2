export type {
  Stream,
  StreamVisibility,
  CreateStreamInput,
  StreamWithToken,
  UpdateStreamMetadataInput,
  StreamStatus,
  StreamLifecycleAction,
  StreamAnalytics,
  StreamTransitionInput,
  ViewerJoinInput,
  ViewerJoinResponse,
  ViewerLeaveInput,
  ViewerLeaveResponse,
} from './stream.js';
export { getStreamStatus } from './stream.js';
export type { User, AuthResponse, LoginInput, RegisterInput } from './user.js';
export type {
  StreamCategory,
  CreateStreamCategoryInput,
  UpdateStreamCategoryInput,
} from './category.js';
export type { LiveKitTokenOptions, LiveKitTokenResponse, RoomMetadata } from './room.js';

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface HealthCheck {
  status: 'ok';
  timestamp: string;
}
