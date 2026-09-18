/* Inline SVG icon system.
 * Usage:
 *   Icons.svg('dashboard')             -> returns SVG string
 *   Icons.render()                     -> replaces all [data-icon] in DOM
 *   <span data-icon="cart" data-size="20"></span>
 */
const Icons = (() => {
  const PATHS = {
    // Branding
    leaf: `<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 12-9a6 6 0 0 1 6 6c0 4-3 8-9 10z"/><path d="M2 22c4-6 10-10 18-12"/>`,
    sprout: `<path d="M7 20h10"/><path d="M12 20V9"/><path d="M12 9C9 9 6 7 6 4c4 0 6 2 6 5z"/><path d="M12 9c3 0 6-2 6-5-4 0-6 2-6 5z"/>`,

    // Navigation
    dashboard: `<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`,
    box: `<path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`,
    cart: `<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 3h2l2.5 12.5A2 2 0 0 0 9.5 17h8.5a2 2 0 0 0 2-1.6L21.5 7H6"/>`,
    receipt: `<path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/>`,
    chart: `<path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 6-7"/>`,
    logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`,
    menu: `<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>`,
    close: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,

    // Actions
    plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
    minus: `<path d="M5 12h14"/>`,
    edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>`,
    trash: `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
    filter: `<path d="M3 4h18"/><path d="M6 12h12"/><path d="M10 20h4"/>`,
    refresh: `<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>`,
    check: `<path d="M20 6 9 17l-5-5"/>`,
    print: `<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>`,

    // Stats
    money: `<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01"/><path d="M18 15v.01"/>`,
    trendUp: `<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>`,
    trendDown: `<path d="M3 7 9 13l4-4 8 8"/><path d="M21 17h-7v-7"/>`,
    calendar: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>`,
    coins: `<circle cx="8" cy="8" r="5"/><path d="M18.1 8.5a5 5 0 0 1 0 7.9"/><path d="M15 12a5 5 0 0 1 0 7.9"/>`,
    layers: `<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>`,
    alert: `<path d="M10.3 3.3a2 2 0 0 1 3.4 0l7.4 12.8A2 2 0 0 1 19.4 19H4.6a2 2 0 0 1-1.7-2.9z"/><path d="M12 9v4"/><path d="M12 17v.01"/>`,
    cartPlus: `<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 3h2l2.5 12.5A2 2 0 0 0 9.5 17h8.5a2 2 0 0 0 2-1.6L21.5 7H6"/><path d="M12 6v4"/><path d="M10 8h4"/>`,

    // Misc
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>`,
    users: `<circle cx="9" cy="8" r="4"/><path d="M2 22a7 7 0 0 1 14 0"/><path d="M17 4a4 4 0 0 1 0 8"/><path d="M22 22a7 7 0 0 0-5-6.7"/>`,
    lock: `<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
    mail: `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>`,
    wifiOff: `<path d="M2 2 22 22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3.5-2.4"/><path d="M15.5 10.1a10 10 0 0 1 3.5 2.4"/><path d="M2 8.8a15 15 0 0 1 4-2.6"/><path d="M18 6.2a15 15 0 0 1 4 2.6"/><path d="M12 20h.01"/>`,
    info: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
    settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
  };

  const svg = (name, { size = 20, stroke = 2, className = '' } = {}) => {
    const d = PATHS[name];
    if (!d) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="icon ${className}" aria-hidden="true">${d}</svg>`;
  };

  const render = (root = document) => {
    root.querySelectorAll('[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon');
      const size = Number(el.getAttribute('data-size')) || 20;
      const stroke = Number(el.getAttribute('data-stroke')) || 2;
      el.innerHTML = svg(name, { size, stroke });
      el.classList.add('icon-wrap');
      el.removeAttribute('data-icon');
    });
  };

  return { svg, render, PATHS };
})();