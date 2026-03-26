import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectBottomNavStyles() {
  if (document.getElementById('bottom-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'bottom-nav-styles';
  style.textContent = `
    /* ── Bottom navigation (mobile only) ───────────── */
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: var(--z-bottom-nav, 190);
      height: var(--bottom-nav-height, 68px);
      background: var(--glass-bg, rgba(15,15,35,0.95));
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    @media (max-width: 767px) {
      .bottom-nav { display: flex; }

      /* Give main content bottom padding so content isn't hidden behind nav */
      body { padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)); }
    }

    .bottom-nav-inner {
      display: flex;
      align-items: stretch;
      width: 100%;
      height: 100%;
    }

    /* ── Nav item ────────────────────────────────────── */
    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 3px;
      color: var(--text-muted, rgba(255,255,255,0.4));
      text-decoration: none;
      cursor: pointer;
      border: none;
      background: none;
      padding: 8px 4px;
      position: relative;
      transition: color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .bottom-nav-item:active {
      transform: scale(0.93);
    }

    .bottom-nav-item.active {
      color: var(--primary, #7c3aed);
    }

    .bottom-nav-item.active .bottom-nav-icon {
      transform: translateY(-2px);
    }

    .bottom-nav-icon {
      font-size: 1.35rem;
      line-height: 1;
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
      position: relative;
    }

    .bottom-nav-label {
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    /* ── Active indicator dot ────────────────────────── */
    .bottom-nav-item.active::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--primary, #7c3aed);
    }

    /* ── Badge ───────────────────────────────────────── */
    .bottom-nav-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      color: #fff;
      font-size: 0.6rem;
      font-weight: 700;
      border-radius: 100px;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-primary, #0f0f23);
    }

    /* ── Create (center) button ──────────────────────── */
    .bottom-nav-create {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      cursor: pointer;
      border: none;
      background: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .bottom-nav-create-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 16px rgba(124,58,237,0.45);
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
      margin-top: -12px;
    }

    .bottom-nav-create:active .bottom-nav-create-icon {
      transform: scale(0.9);
      box-shadow: 0 2px 8px rgba(124,58,237,0.3);
    }

    .bottom-nav-create .bottom-nav-label {
      color: var(--text-muted, rgba(255,255,255,0.4));
      font-size: 0.65rem;
    }
  `;
  document.head.appendChild(style);
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderBottomNav(user) {
  injectBottomNavStyles();

  const currentPath = location.pathname;

  const isActive = (href) =>
    currentPath === href || (href !== '/' && currentPath.startsWith(href));

  const profileHref = user ? `/profile/${user.username || user.uid}` : '/profile';

  return `
    <nav class="bottom-nav" id="bottom-nav" role="navigation" aria-label="Mobile bottom navigation">
      <div class="bottom-nav-inner">

        <!-- Home -->
        <a href="/"
           data-link
           class="bottom-nav-item ${isActive('/') && currentPath === '/' ? 'active' : ''}"
           id="bn-home"
           aria-label="Home">
          <span class="bottom-nav-icon" aria-hidden="true">🏠</span>
          <span class="bottom-nav-label">Home</span>
        </a>

        <!-- Explore -->
        <a href="/explore"
           data-link
           class="bottom-nav-item ${isActive('/explore') ? 'active' : ''}"
           id="bn-explore"
           aria-label="Explore">
          <span class="bottom-nav-icon" aria-hidden="true">🔍</span>
          <span class="bottom-nav-label">Explore</span>
        </a>

        <!-- Create (center) -->
        <button class="bottom-nav-create"
                id="bn-create"
                type="button"
                aria-label="Create post">
          <div class="bottom-nav-create-icon" aria-hidden="true">✦</div>
          <span class="bottom-nav-label">Create</span>
        </button>

        <!-- Messages -->
        <a href="/messages"
           data-link
           class="bottom-nav-item ${isActive('/messages') ? 'active' : ''}"
           id="bn-messages"
           aria-label="Messages">
          <span class="bottom-nav-icon" aria-hidden="true">
            📬
            <span class="bottom-nav-badge" id="bn-messages-badge" aria-live="polite"></span>
          </span>
          <span class="bottom-nav-label">Messages</span>
        </a>

        <!-- Profile -->
        <a href="${profileHref}"
           data-link
           class="bottom-nav-item ${isActive('/profile') ? 'active' : ''}"
           id="bn-profile"
           aria-label="Profile">
          <span class="bottom-nav-icon" aria-hidden="true">👤</span>
          <span class="bottom-nav-label">Profile</span>
        </a>

      </div>
    </nav>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initBottomNav() {
  // Create post button → open modal
  document.getElementById('bn-create')?.addEventListener('click', async () => {
    const user = store.getState().user;
    if (!user) {
      router.navigate('/auth/login');
      return;
    }
    try {
      const { openCreatePostModal } = await import('../modals/createPost.js');
      openCreatePostModal(user);
    } catch (e) {
      console.error('Failed to load createPost modal:', e);
    }
  });

  // Badge updates from store
  const updateBadges = () => {
    const state = store.getState();

    const msgBadge = document.getElementById('bn-messages-badge');
    if (msgBadge) {
      const m = state.unreadMessages || 0;
      msgBadge.textContent = m > 99 ? '99+' : m;
      msgBadge.style.display = m > 0 ? 'flex' : 'none';
    }
  };

  store.subscribeAll(updateBadges);
  updateBadges();

  // Active state on route changes
  eventBus.on(EVENTS.ROUTE_CHANGED, () => {
    const path = location.pathname;

    const homeItem     = document.getElementById('bn-home');
    const exploreItem  = document.getElementById('bn-explore');
    const messagesItem = document.getElementById('bn-messages');
    const profileItem  = document.getElementById('bn-profile');

    if (homeItem)     homeItem.classList.toggle('active', path === '/');
    if (exploreItem)  exploreItem.classList.toggle('active', path.startsWith('/explore'));
    if (messagesItem) messagesItem.classList.toggle('active', path.startsWith('/messages'));
    if (profileItem)  profileItem.classList.toggle('active', path.startsWith('/profile'));
  });
}
