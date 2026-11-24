export function handleApiError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
  if (status === 401) {
    localStorage.removeItem('token');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  console.error('[API Error]:', { status, message });
}
