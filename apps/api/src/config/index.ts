import 'dotenv/config';

function normalizeLiveKitHost(value: string): string {
  return value.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

const livekitHost = process.env.LIVEKIT_HOST || process.env.LIVEKIT_URL || '';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  enableTempAuth: process.env.ENABLE_TEMP_AUTH === 'true',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    host: normalizeLiveKitHost(livekitHost),
  },
};
