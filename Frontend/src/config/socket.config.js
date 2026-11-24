export const SOCKET_CONFIG = {
  url: import.meta.env.VITE_SOCKET_URL || '/',
  reconnectAttempts: 10,
  reconnectDelay: 2000,
};
