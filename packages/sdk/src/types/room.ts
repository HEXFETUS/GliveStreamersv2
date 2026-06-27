export interface LiveKitTokenOptions {
  identity: string;
  room: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
}

export interface LiveKitTokenResponse {
  token: string;
  identity: string;
  room: string;
  canPublish: boolean;
  canSubscribe: boolean;
}

export interface RoomMetadata {
  streamId: string;
  title: string;
  userId: string;
}
