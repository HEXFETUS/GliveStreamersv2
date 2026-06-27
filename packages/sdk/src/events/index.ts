import type {
  Stream,
  StreamAnalytics,
  StreamLifecycleAction,
  ViewerJoinResponse,
  ViewerLeaveResponse,
} from '../types/index.js';

export interface GLiveEventPayloads {
  streamStarted: {
    stream: Stream;
    token?: string;
  };
  streamEnded: {
    stream: Stream;
  };
  viewerJoined: ViewerJoinResponse & {
    streamId: string;
  };
  viewerLeft: ViewerLeaveResponse & {
    streamId: string;
  };
  connectionLost: {
    error: unknown;
    operation?: string;
  };
  streamLifecycleChanged: {
    stream: Stream;
    action: StreamLifecycleAction;
  };
  analyticsUpdated: {
    streamId: string;
    analytics: StreamAnalytics;
  };
}

export type GLiveEventName = keyof GLiveEventPayloads;
export type GLiveEventHandler<TEvent extends GLiveEventName> = (
  payload: GLiveEventPayloads[TEvent],
) => void;
type AnyEventHandler = (payload: GLiveEventPayloads[GLiveEventName]) => void;

export class GLiveEventEmitter {
  private listeners = new Map<GLiveEventName, Set<AnyEventHandler>>();

  on<TEvent extends GLiveEventName>(
    event: TEvent,
    handler: GLiveEventHandler<TEvent>,
  ): () => void {
    const handlers = this.listeners.get(event) ?? new Set<AnyEventHandler>();
    handlers.add(handler as AnyEventHandler);
    this.listeners.set(event, handlers);

    return () => this.off(event, handler);
  }

  once<TEvent extends GLiveEventName>(
    event: TEvent,
    handler: GLiveEventHandler<TEvent>,
  ): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  }

  off<TEvent extends GLiveEventName>(
    event: TEvent,
    handler: GLiveEventHandler<TEvent>,
  ): void {
    this.listeners.get(event)?.delete(handler as AnyEventHandler);
  }

  protected emit<TEvent extends GLiveEventName>(
    event: TEvent,
    payload: GLiveEventPayloads[TEvent],
  ): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}
