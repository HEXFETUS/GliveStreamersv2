import {
  type LocalVideoTrack,
  type RemoteAudioTrack,
  type RemoteTrack,
  type RemoteVideoTrack,
  type Room,
  type RoomConnectOptions,
  Room as LiveKitRoom,
  RoomEvent,
  Track,
} from 'livekit-client';

export type {
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteTrack,
  RemoteVideoTrack,
  Room,
  RoomConnectOptions,
};

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

export async function enablePublisherCamera(room: Room): Promise<LocalVideoTrack> {
  const publication = await room.localParticipant.setCameraEnabled(true);
  const videoTrack = publication?.videoTrack;

  if (!videoTrack) {
    throw new Error('Camera was enabled, but no local video track was created.');
  }

  return videoTrack;
}

export async function enablePublisherMicrophone(room: Room): Promise<void> {
  await room.localParticipant.setMicrophoneEnabled(true);
}

export function attachVideoTrack(
  track: LocalVideoTrack,
  element: HTMLVideoElement,
): void {
  track.attach(element);
  element.muted = true;
  element.playsInline = true;
}

export function stopLocalVideoTrack(track?: LocalVideoTrack | null): void {
  track?.detach();
  track?.stop();
}

export function attachRemoteVideoTrack(
  track: RemoteVideoTrack,
  element: HTMLVideoElement,
): void {
  track.attach(element);
  element.autoplay = true;
  element.playsInline = true;
}

export function attachRemoteAudioTrack(track: RemoteAudioTrack): HTMLAudioElement {
  const element = track.attach() as HTMLAudioElement;
  element.autoplay = true;
  return element;
}

export function detachRemoteTrack(
  track: RemoteTrack,
  element?: HTMLMediaElement,
): void {
  if (element) {
    track.detach(element);
    return;
  }

  track.detach();
}

/**
 * Build a LiveKit participant identity from a user ID.
 */
export function makeParticipantIdentity(userId: string): string {
  return `streamer_${userId}`;
}

export { LiveKitRoom, RoomEvent, Track };
