import {
  type Room,
  type RoomConnectOptions,
  type RoomEvent,
  Room as LiveKitRoom,
} from 'livekit-client';

export type { Room, RoomConnectOptions, RoomEvent };

/**
 * Creates a LiveKit room and connects using a token obtained from the API.
 */
export async function connectToLiveKitRoom(
  token: string,
  host?: string,
  options?: RoomConnectOptions,
): Promise<Room> {
  const room = new LiveKitRoom();
  await room.connect(host ?? 'ws://localhost:7880', token, options);
  return room;
}

export function disconnectFromLiveKitRoom(room?: Room | null): void {
  room?.disconnect();
}

/**
 * Build a LiveKit participant identity from a user ID.
 */
export function makeParticipantIdentity(userId: string): string {
  return `streamer_${userId}`;
}

export { LiveKitRoom };
