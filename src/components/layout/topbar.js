import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';
import { showToast } from '../../utils/dom.js';

// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectTopbarStyles() {
  if (document.getElementById('topbar-styles')) return;
  const style = document.createElement('style');
  style.id = 'topbar-styles';
  style.textContent = `
    /* ── Topbar ─────────────────────────────────────── */
    .topbar {
      position: sticky;
      top: 0;
      z-index: var(--z-topbar, 150);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 20px;
      height: var(--topbar-height, 64px);
      background: var(--glass-bg, rgba(15,15,35,0.88));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.07));
      transition: box-shadow 0.2s ease;
    }

    .topbar.scrolled {
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }

    /* ── Hamburger ───────────────────────────────────── */
    .topbar-hamburger {
      display: none;
      flex-shrink: 0;
    }

    /* ── Mobile logo ─────────────────────────────────── */
    .topbar-mobile-logo {
      display: none;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      flex-shrink: 0;
    }

    .topbar-mobile-logo .logo-icon {
      font-size: 1.3rem;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .topbar-mobile-logo .logo-text {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* ── Back button ─────────────────────────────────── */
    .topbar-back-btn {
      display: none;
      flex-shrink: 0;
    }

    .topbar-back-btn.visible {
      display: flex;
    }

    /* ── Page title ──────────────────────────────────── */
    .topbar-page-title {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-primary, #fff);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Search ──────────────────────────────────────── */
    .topbar-search {
      flex: 1;
      max-width: 480px;
      position: relative;
    }

    .topbar-search-input {
      width: 100%;
      padding: 9px 16px 9px 40px;
      background: var(--glass-subtle, rgba(255,255,255,0.06));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 100px;
      color: var(--text-primary, #fff);
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s ease;
    }

    .topbar-search-input::placeholder {
      color: var(--text-muted, rgba(255,255,255,0.35));
    }

    .topbar-search-input:focus {
      border-color: var(--primary, #7c3aed);
      background: var(--glass-hover, rgba(255,255,255,0.09));
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.15));
    }

    .topbar-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, rgba(255,255,255,0.4));
      font-size: 0.95rem;
      pointer-events: none;
    }

    .topbar-search-btn {
      display: none;
      flex-shrink: 0;
    }

    /* ── Spacer ──────────────────────────────────────── */
    .topbar-spacer {
      flex: 1;
    }

    /* ── Actions ─────────────────────────────────────── */
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* ── Theme toggle ────────────────────────────────── */
    .topbar-theme-btn {
      font-size: 1.1rem;
      transition: transform 0.3s ease;
    }

    .topbar-theme-btn:hover {
      transform: rotate(20deg) scale(1.15);
    }

    /* ── Notification bell ───────────────────────────── */
    .topbar-notif-btn {
      position: relative;
    }

    .topbar-notif-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      border-radius: 100px;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-primary, #0f0f23);
    }

    /* ── Avatar ──────────────────────────────────────── */
    .topbar-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--primary, #7c3aed);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      flex-shrink: 0;
    }

    .topbar-avatar:hover {
      transform: scale(1.08);
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.3));
    }

    /* ── Btn overrides ───────────────────────────────── */
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--text-secondary, rgba(255,255,255,0.7));
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s ease, color 0.2s ease;
      flex-shrink: 0;
    }

    .btn-icon:hover {
      background: var(--glass-hover, rgba(255,255,255,0.08));
      color: var(--text-primary, #fff);
    }

    /* ── Mobile adjustments ──────────────────────────── */
    @media (max-width: 768px) {
      .topbar-hamburger    { display: flex; }
      .topbar-mobile-logo  { display: flex; }
      .topbar-search       { display: none; }
      .topbar-search-btn   { display: flex; }
      .topbar-page-title   { display: none; }
    }

    @media (min-width: 769px) {
      .topbar-hamburger    { display: none; }
      .topbar-mobile-logo  { display: none; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES = {
  '/':               'Home',
  '/explore':        'Explore',
  '/notifications':  'Notifications',
  '/messages':       'Messages',
  '/settings':       'Settings',
  '/projects/upload':'Upload Project',
  '/admin':          'Admin Dashboard',
  '/admin/moderation': 'Moderation',
};

function getPageTitle(path) {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (path.startsWith('/profile/')) return 'Profile';
  if (path.startsWith('/projects/')) return 'Project';
  if (path.startsWith('/messages/')) return 'Chat';
  return 'AETHER';
}

const MAIN_PATHS = ['/', '/explore', '/notifications', '/messages'];

function isMainPage(path) {
  return MAIN_PATHS.includes(path) || path === '/';
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderTopbar(user) {
  injectTopbarStyles();

  const currentPath = location.pathname;
  const showBack    = !isMainPage(currentPath);
  const pageTitle   = getPageTitle(currentPath);
  const isDark      = document.documentElement.dataset.theme !== 'light';
  const themeIcon   = isDark ? '☀️' : '🌙';

  return `
    <header class="topbar" id="topbar" role="banner">

      <!-- Hamburger (mobile only) -->
      <button class="btn btn-icon topbar-hamburger" id="topbar-hamburger" aria-label="Open menu">☰</button>

      <!-- Back button (non-main pages) -->
      <button class="btn btn-icon topbar-back-btn ${showBack ? 'visible' : ''}" id="topbar-back-btn" aria-label="Go back">←</button>

      <!-- Mobile logo -->
      <a href="/" data-link class="topbar-mobile-logo" aria-label="AETHER Home">
        <span class="logo-icon">✦</span>
        <span class="logo-text">AETHER</span>
      </a>

      <!-- Page title (desktop) -->
      <span class="topbar-page-title" id="topbar-page-title">${pageTitle}</span>

      <!-- Desktop search bar -->
      <div class="topbar-search" role="search">
        <span class="topbar-search-icon" aria-hidden="true">🔍</span>
        <input type="search"
               id="topbar-search-input"
               class="topbar-search-input"
               placeholder="Search AETHER..."
               aria-label="Search"
               autocomplete="off">
      </div>

      <div class="topbar-spacer"></div>

      <div class="topbar-actions">
        <!-- Mobile search button -->
        <button class="btn btn-icon topbar-search-btn" id="topbar-search-btn" aria-label="Search">🔍</button>

        <!-- Theme toggle -->
        <button class="btn btn-icon topbar-theme-btn" id="topbar-theme-btn" aria-label="Toggle theme" title="Toggle theme">
          ${themeIcon}
        </button>

        <!-- Notification bell -->
        <button class="btn btn-icon topbar-notif-btn" id="topbar-notif-btn" aria-label="Notifications">
          🔔
          <span class="topbar-notif-badge" id="topbar-notif-badge" aria-live="polite"></span>
        </button>

        <!-- User avatar -->
        ${user ? `
          <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=7c3aed&color=fff`}"
               alt="${user.displayName || 'Profile'}"
               class="topbar-avatar"
               id="topbar-avatar"
               title="Go to profile"
               onerror="this.src='https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff'">
        ` : ''}
      </div>
    </header>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTopbar() {
  // Hamburger → open sidebar
  document.getElementById('topbar-hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar-container')?.classList.add('sidebar-open');
  });

  // Back button
  document.getElementById('topbar-back-btn')?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.navigate('/');
    }
  });

  // Desktop search input (debounced navigate)
  const searchInput = document.getElementById('topbar-search-input');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          router.navigate(`/explore?q=${encodeURIComponent(q)}`);
        } else {
          router.navigate('/explore');
        }
      }
    });
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        // Optionally show live suggestions (extend here)
      }, 300);
    });
  }

  // Mobile search button → navigate to explore
  document.getElementById('topbar-search-btn')?.addEventListener('click', () => {
    router.navigate('/explore');
  });

  // Theme toggle
  const themeBtn = document.getElementById('topbar-theme-btn');
  themeBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme !== 'light';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    store.setTheme(newTheme);
    themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    eventBus.emit(EVENTS.THEME_CHANGED, newTheme);
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info', 1500);
  });

  // Sync theme icon with stored theme
  const storedTheme = store.getState().theme || localStorage.getItem('aether-theme') || 'dark';
  document.documentElement.dataset.theme = storedTheme;
  if (themeBtn) {
    themeBtn.textContent = storedTheme === 'dark' ? '☀️' : '🌙';
  }

  // Notification bell → navigate
  document.getElementById('topbar-notif-btn')?.addEventListener('click', () => {
    router.navigate('/notifications');
  });

  // Avatar → navigate to profile
  document.getElementById('topbar-avatar')?.addEventListener('click', () => {
    const user = store.getState().user;
    if (user) router.navigate(`/profile/${user.username || user.uid}`);
  });

  // Notification badge from store
  const updateBadge = () => {
    const badge = document.getElementById('topbar-notif-badge');
    if (!badge) return;
    const n = store.getState().unreadCount || 0;
    badge.textContent = n > 99 ? '99+' : n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  };
  store.subscribeAll(updateBadge);
  updateBadge();

  // Scroll shadow
  const topbar = document.getElementById('topbar');
  if (topbar) {
    const mainEl = document.querySelector('.main-content') || window;
    const scrollTarget = mainEl === window ? window : mainEl;
    scrollTarget.addEventListener('scroll', () => {
      const scrollTop = mainEl === window ? window.scrollY : mainEl.scrollTop;
      topbar.classList.toggle('scrolled', scrollTop > 10);
    }, { passive: true });
  }

  // Update back button and title on route change
  eventBus.on(EVENTS.ROUTE_CHANGED, () => {
    const path = location.pathname;
    const backBtn = document.getElementById('topbar-back-btn');
    const titleEl = document.getElementById('topbar-page-title');
    if (backBtn) backBtn.classList.toggle('visible', !isMainPage(path));
    if (titleEl) titleEl.textContent = getPageTitle(path);
  });

  // Listen for theme changes from elsewhere
  eventBus.on(EVENTS.THEME_CHANGED, (theme) => {
    const btn = document.getElementById('topbar-theme-btn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}
