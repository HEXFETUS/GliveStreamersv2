import axios, { type AxiosInstance } from 'axios';
import { GLiveEventEmitter } from '../events/index.js';
import type {
  Stream,
  StreamWithToken,
  CreateStreamInput,
  UpdateStreamMetadataInput,
  AuthResponse,
  LoginInput,
  RegisterInput,
  HealthCheck,
  User,
  LiveKitTokenResponse,
  StreamAnalytics,
  StreamLifecycleAction,
  ViewerJoinInput,
  ViewerJoinResponse,
  ViewerLeaveInput,
  ViewerLeaveResponse,
  StreamCategory,
  CreateStreamCategoryInput,
  UpdateStreamCategoryInput,
} from '../types/index.js';

export interface GliveClientConfig {
  baseURL?: string;
  getToken?: () => string | null;
}

interface BindableRoom {
  on(event: string, handler: () => void): unknown;
  off?(event: string, handler: () => void): unknown;
}

export class GliveApiClient extends GLiveEventEmitter {
  private http: AxiosInstance;
  private getToken?: () => string | null;

  constructor(baseURL: string, getToken?: () => string | null) {
    super();
    this.getToken = getToken;
    this.http = axios.create({ baseURL });
    this.installInterceptors();
  }

  configure(config: GliveClientConfig): void {
    if (config.getToken) {
      this.getToken = config.getToken;
    }

    this.http = axios.create({ baseURL: config.baseURL ?? this.http.defaults.baseURL });
    this.installInterceptors();
  }

  private installInterceptors(): void {
    if (this.getToken) {
      this.http.interceptors.request.use((config) => {
        const token = this.getToken?.();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });
    }

    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          this.emit('connectionLost', {
            error,
            operation: error.config?.url,
          });
        }

        return Promise.reject(error);
      },
    );
  }

  // --- Health ---

  async health(): Promise<HealthCheck> {
    const { data } = await this.http.get<HealthCheck>('/health');
    return data;
  }

  // --- Auth ---

  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await this.http.post<AuthResponse>('/api/auth/register', input);
    return data;
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await this.http.post<AuthResponse>('/api/auth/login', input);
    return data;
  }

  async getProfile(): Promise<{ user: User }> {
    const { data } = await this.http.get<{ user: User }>('/api/auth/me');
    return data;
  }

  logout(): void {
    // Token removal is handled client-side by auth helpers.
  }

  bindRoomConnection(room: BindableRoom, operation = 'livekit-room'): () => void {
    const handler = () => {
      this.emit('connectionLost', {
        error: new Error('LiveKit room disconnected'),
        operation,
      });
    };

    room.on('disconnected', handler);

    return () => {
      room.off?.('disconnected', handler);
    };
  }

  // --- Categories ---

  async listCategories(): Promise<StreamCategory[]> {
    const { data } = await this.http.get<{ categories: StreamCategory[] }>(
      '/api/categories',
    );
    return data.categories;
  }

  async createCategory(
    input: CreateStreamCategoryInput,
  ): Promise<StreamCategory> {
    const { data } = await this.http.post<{ category: StreamCategory }>(
      '/api/categories',
      input,
    );
    return data.category;
  }

  async updateCategory(
    categoryId: string,
    input: UpdateStreamCategoryInput,
  ): Promise<StreamCategory> {
    const { data } = await this.http.patch<{ category: StreamCategory }>(
      `/api/categories/${categoryId}`,
      input,
    );
    return data.category;
  }

  // --- Streams ---

  async createStream(input: CreateStreamInput): Promise<StreamWithToken> {
    const { data } = await this.http.post<StreamWithToken>('/api/streams', input);
    return data;
  }

  async updateStreamMetadata(
    streamId: string,
    input: UpdateStreamMetadataInput,
  ): Promise<Stream> {
    const { data } = await this.http.patch<{ stream: Stream }>(
      `/api/streams/${streamId}/metadata`,
      input,
    );
    return data.stream;
  }

  async getStreamToken(streamId: string): Promise<LiveKitTokenResponse> {
    const { data } = await this.http.get<LiveKitTokenResponse>(
      `/api/streams/${streamId}/token`,
    );
    return data;
  }

  async getPublisherToken(streamId: string): Promise<LiveKitTokenResponse> {
    const { data } = await this.http.post<LiveKitTokenResponse>(
      `/api/streams/${streamId}/publisher-token`,
    );
    return data;
  }

  async deleteStream(streamId: string): Promise<void> {
    await this.http.delete(`/api/streams/${streamId}`);
  }

  async startStream(streamId: string): Promise<StreamWithToken> {
    const { data } = await this.http.post<StreamWithToken>(
      `/api/streams/${streamId}/start`,
    );
    this.emit('streamStarted', { stream: data, token: data.token });
    this.emit('streamLifecycleChanged', { stream: data, action: 'start' });
    return data;
  }

  async stopStream(streamId: string): Promise<Stream> {
    const { data } = await this.http.post<{ stream: Stream }>(
      `/api/streams/${streamId}/stop`,
    );
    this.emit('streamEnded', { stream: data.stream });
    this.emit('streamLifecycleChanged', { stream: data.stream, action: 'end' });
    return data.stream;
  }

  async transitionStream(
    streamId: string,
    action: StreamLifecycleAction,
  ): Promise<Stream> {
    const { data } = await this.http.post<{ stream: Stream }>(
      `/api/streams/${streamId}/transition`,
      { action },
    );
    this.emit('streamLifecycleChanged', { stream: data.stream, action });
    if (data.stream.status === 'live') {
      this.emit('streamStarted', { stream: data.stream });
    }
    if (data.stream.status === 'ended') {
      this.emit('streamEnded', { stream: data.stream });
    }
    return data.stream;
  }

  async viewerJoin(
    streamId: string,
    input: ViewerJoinInput = {},
  ): Promise<ViewerJoinResponse> {
    const { data } = await this.http.post<ViewerJoinResponse>(
      `/api/streams/${streamId}/viewers/join`,
      input,
    );
    this.emit('viewerJoined', { ...data, streamId });
    this.emit('analyticsUpdated', {
      streamId,
      analytics: data.analytics,
    });
    return data;
  }

  async viewerLeave(
    streamId: string,
    input: ViewerLeaveInput = {},
  ): Promise<ViewerLeaveResponse> {
    const { data } = await this.http.post<ViewerLeaveResponse>(
      `/api/streams/${streamId}/viewers/leave`,
      input,
    );
    this.emit('viewerLeft', { ...data, streamId });
    this.emit('analyticsUpdated', {
      streamId,
      analytics: data.analytics,
    });
    return data;
  }

  async getStreamAnalytics(streamId: string): Promise<StreamAnalytics> {
    const { data } = await this.http.get<{ analytics: StreamAnalytics }>(
      `/api/streams/${streamId}/analytics`,
    );
    this.emit('analyticsUpdated', {
      streamId,
      analytics: data.analytics,
    });
    return data.analytics;
  }

  async listStreams(): Promise<Stream[]> {
    const { data } = await this.http.get<{ streams: Stream[] }>('/api/streams');
    return data.streams;
  }

  async listPublicStreams(): Promise<Stream[]> {
    const { data } = await this.http.get<{ streams: Stream[] }>('/api/streams/public');
    return data.streams;
  }
}

export const GLive = new GliveApiClient('');
