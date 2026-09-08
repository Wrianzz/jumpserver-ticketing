import axios from 'axios';
import crypto from 'node:crypto';

function fingerprintToken(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function redactUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) {
      if (/token|secret|password|code|otp/i.test(key)) url.searchParams.set(key, '[REDACTED]');
    }
    return url.toString();
  } catch {
    return value;
  }
}

function getAuthMeta(headers: any) {
  const authorization = headers?.Authorization ?? headers?.authorization;
  if (typeof authorization !== 'string') {
    return { present: false };
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  return {
    present: Boolean(token),
    scheme: scheme || undefined,
    tokenLength: token?.length,
    tokenFingerprint: fingerprintToken(token),
  };
}

function getResponseMeta(data: any) {
  if (!data || typeof data !== 'object') return undefined;
  return {
    code: typeof data.code === 'string' ? data.code : undefined,
    detail: typeof data.detail === 'string' ? data.detail : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
    userId: typeof data.id === 'string' ? data.id : undefined,
    username: typeof data.username === 'string' ? data.username : undefined,
  };
}

console.log('=== Ticketing Backend Axios Debug ===');
console.log({
  timestamp: new Date().toISOString(),
  jumpsServerUrl: process.env.JUMPSERVER_URL || '[not loaded yet]',
  jumpsServerOrgId: process.env.JUMPSERVER_ORG_ID || '[not loaded yet]',
});

axios.interceptors.request.use((config) => {
  console.log('[Ticketing Backend Debug] outbound request', {
    timestamp: new Date().toISOString(),
    method: config.method?.toUpperCase(),
    url: redactUrl(config.url),
    baseURL: config.baseURL,
    auth: getAuthMeta(config.headers),
    orgHeader: config.headers?.['X-JMS-ORG'] ?? config.headers?.['x-jms-org'],
  });
  return config;
});

axios.interceptors.response.use(
  (response) => {
    console.log('[Ticketing Backend Debug] outbound response', {
      timestamp: new Date().toISOString(),
      status: response.status,
      method: response.config.method?.toUpperCase(),
      url: redactUrl(response.config.url),
      response: getResponseMeta(response.data),
    });
    return response;
  },
  (error) => {
    console.error('[Ticketing Backend Debug] outbound error', {
      timestamp: new Date().toISOString(),
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: redactUrl(error.config?.url),
      auth: getAuthMeta(error.config?.headers),
      orgHeader: error.config?.headers?.['X-JMS-ORG'] ?? error.config?.headers?.['x-jms-org'],
      response: getResponseMeta(error.response?.data),
      errorCode: error.code,
      errorMessage: error.message,
    });
    return Promise.reject(error);
  },
);

await import('./index.ts');
