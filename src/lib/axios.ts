/// <reference types="vite/client" />
import axios from 'axios';

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  // JumpServer's MFA challenge is stateful and stores the password/MFA
  // verification state in the Django session cookie. Keep that cookie on
  // auth -> MFA -> token requests instead of creating a fresh session.
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('jumpserver_token');
    const storedUser = sessionStorage.getItem('jumpserver_user');
    const url = String(config.url || '');
    const isAuthRequest =
      url.includes('/api/v1/authentication/auth/') ||
      url.includes('/api/v1/authentication/mfa/');

    // Login and MFA requests must start clean. Do not attach a previous
    // session's bearer token or portal user identity to these endpoints.
    if (!isAuthRequest) {
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (storedUser && config.headers) {
        try {
          const user = JSON.parse(storedUser);
          if (user?.id) config.headers['X-Portal-User-ID'] = user.id;
        } catch {
          // Ignore malformed session user data.
        }
      }
    }

    // --- DUMMY MODE MOCKING ---
    if (!isAuthRequest && token?.startsWith('dummy_')) {
      config.adapter = async (config) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (config.url?.includes('suggestions')) {
          let mockResults = [];
          if (config.url.includes('nodes')) {
            mockResults = [
              { id: 'dummy-node-1', name: 'Production Node 1 (Dummy)' },
              { id: 'dummy-node-2', name: 'Staging Node 2 (Dummy)' },
            ];
          } else if (config.url.includes('assets')) {
            mockResults = [
              { id: 'dummy-asset-1', name: 'Production Asset 1 (Dummy)' },
              { id: 'dummy-asset-2', name: 'Staging Asset 2 (Dummy)' },
            ];
          } else if (config.url.includes('username-suggestions')) {
            mockResults = [
              { id: 'admin-1', name: 'administrator' },
              { id: 'user-1', name: 'ARYANTO' },
              { id: 'user-2', name: 'Cindy' },
              { id: 'user-3', name: 'FABIAN' },
              { id: 'user-4', name: 'INPUT_YOUR_USERNAME' },
              { id: 'user-5', name: 'TRIA' },
              { id: 'user-6', name: 'Vincent' },
            ];
          }

          return {
            data: { results: mockResults },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          } as any;
        }

        if (config.method === 'post' && config.url?.includes('asset-tickets')) {
          return {
            data: { id: 'dummy-ticket-12345', status: 'success' },
            status: 201,
            statusText: 'Created',
            headers: {},
            config,
          } as any;
        }

        return { data: {}, status: 200, statusText: 'OK', headers: {}, config } as any;
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || '').includes('/authentication/')) {
      sessionStorage.removeItem('jumpserver_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
