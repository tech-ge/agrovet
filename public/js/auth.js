const Auth = (() => {
  const TOKEN_KEY = 'av_token';
  const USER_KEY = 'av_user';

  const setSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return {
    login: async (email, password) => {
      const data = await API.post('/auth/login', { email, password });
      setSession(data.token, data.user);
      return data.user;
    },
    register: async ({ name, email, password }) => {
      const data = await API.post('/auth/register', { name, email, password });
      setSession(data.token, data.user);
      return data.user;
    },
    logout: () => {
      clearSession();
      window.location.href = '/login.html';
    },
    user: () => {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY));
      } catch {
        return null;
      }
    },
    isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
  };
})();