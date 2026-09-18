const API = (() => {
  const BASE = '/api';

  const getToken = () => localStorage.getItem('av_token');

  const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const opts = {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...headers,
      },
    };

    const token = getToken();
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: `HTTP ${res.status}` };
    }

    if (res.status === 401) {
      localStorage.removeItem('av_token');
      if (!location.pathname.includes('login') && !location.pathname.includes('register')) {
        location.href = '/login.html';
      }
    }

    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  };

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body }),
    put: (p, body) => request(p, { method: 'PUT', body }),
    patch: (p, body) => request(p, { method: 'PATCH', body }),
    del: (p) => request(p, { method: 'DELETE' }),
  };
})();