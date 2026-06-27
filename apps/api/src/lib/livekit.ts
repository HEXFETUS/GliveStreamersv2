import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config/index.js';

interface CreateLiveKitTokenOptions {
  canPublish?: boolean;
  canSubscribe?: boolean;
}

interface LiveKitRoomMetadata {
  streamId: string;
  title: string;
  userId: string;
}

export const roomService = new RoomServiceClient(
  config.livekit.host,
  config.livekit.apiKey,
  config.livekit.apiSecret,
);

export function isLiveKitConfigured(): boolean {
  return Boolean(
    config.livekit.host &&
      config.livekit.apiKey &&
      config.livekit.apiSecret,
  );
}

export async function createLiveKitToken(
  identity: string,
  room: string,
  options?: CreateLiveKitTokenOptions,
): Promise<string> {
  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity,
    ttl: '1h',
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: options?.canPublish ?? true,
    canSubscribe: options?.canSubscribe ?? true,
  });

  return at.toJwt();
}

export async function ensureLiveKitRoom(
  roomName: string,
  metadata: LiveKitRoomMetadata,
): Promise<boolean> {
  if (!isLiveKitConfigured()) {
    return false;
  }

  const existingRooms = await roomService.listRooms([roomName]);
  if (existingRooms.length > 0) {
    return true;
  }

  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 10 * 60,
    departureTimeout: 2 * 60,
    metadata: JSON.stringify(metadata),
  });

  return true;
}
