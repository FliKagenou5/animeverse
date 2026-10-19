import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/')) {
      window.dispatchEvent(new Event('animeverse:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function getApiError(error) {
  if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
    return { message: 'Request cancelled.', code: 'CANCELLED' };
  }
  const payload = error?.response?.data?.error;
  if (payload?.message) {
    return { message: payload.message, code: payload.code, details: payload.details };
  }
  if (error?.code === 'ECONNABORTED') {
    return { message: 'The request timed out. Please try again.', code: 'TIMEOUT' };
  }
  if (!error?.response) {
    return {
      message: 'Cannot reach the ANIMEVERSE API. Is the server running on port 4000?',
      code: 'NETWORK_ERROR',
    };
  }
  return {
    message: `Request failed with status ${error.response.status}.`,
    code: 'REQUEST_FAILED',
  };
}

export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!details || !details.fieldErrors) return {};
  return Object.fromEntries(
    Object.entries(details.fieldErrors).filter(([, messages]) => messages?.length),
  );
}
