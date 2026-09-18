/* Registers the service worker and exposes update helpers. */
const SWRegister = (() => {
  let registration = null;
  let updateReady = false;

  const register = async () => {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
      console.warn('[PWA] Service worker requires HTTPS or localhost');
      return;
    }

    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service worker registered');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateReady = true;
            showUpdateBanner();
          }
        });
      });

      // Periodic update check
      setInterval(() => registration?.update(), 60 * 60 * 1000);
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
    }
  };

  const showUpdateBanner = () => {
    if (document.getElementById('sw-update-banner')) return;
    const el = document.createElement('div');
    el.id = 'sw-update-banner';
    el.className = 'sw-update-banner';
    el.innerHTML = `
      <span>A new version is available.</span>
      <button class="btn btn-primary btn-sm" id="sw-update-btn">Refresh</button>
    `;
    document.body.appendChild(el);
    document.getElementById('sw-update-btn').addEventListener('click', () => {
      registration?.waiting?.postMessage('SKIP_WAITING');
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    });
  };

  return { register };
})();

window.addEventListener('load', () => SWRegister.register());