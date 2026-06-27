import { GliveApiClient, getStoredToken } from '@glive/sdk';

const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = new GliveApiClient(apiURL, getStoredToken);
