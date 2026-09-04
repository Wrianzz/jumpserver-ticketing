/// <reference types="vite/client" />
import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the Bearer token and authenticated portal user id to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('jumpserver_token');
    const storedUser = sessionStorage.getItem('jumpserver_user');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (storedUser && config.headers) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.id) config.headers['X-Portal-User-ID'] = user.id;
      } catch {
        // Ignore malformed session user data; the backend will reject protected routes.
      }
    }

    // --- DUMMY MODE MOCKING ---
    if (token?.startsWith('dummy_')) {
      config.adapter = async (config) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock AsyncSelect endpoints (Nodes/Assets/Accounts)
        if (config.url?.includes('suggestions')) {
          let type = 'Item';
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
            data: {
              results: mockResults
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          } as any;
        }

        // Mock Ticket Creation
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
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized globally by clearing token and redirecting to login
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('jumpserver_token');
      // Dispatch a custom event so the React router can pick it up and redirect
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
