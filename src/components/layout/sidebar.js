import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';
import { logout } from '../../services/auth.service.js';
import { showToast } from '../../utils/dom.js';

// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectSidebarStyles() {
  if (document.getElementById('sidebar-styles')) return;
  const style = document.createElement('style');
  style.id = 'sidebar-styles';
  style.textContent = `
    /* ── Sidebar ────────────────────────────────────── */
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: var(--sidebar-width, 260px);
      background: var(--glass-bg, rgba(15,15,35,0.92));
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-right: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      z-index: var(--z-sidebar, 200);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }

    /* ── Sidebar overlay (mobile) ───────────────────── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: calc(var(--z-sidebar, 200) - 1);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    /* ── Header ─────────────────────────────────────── */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      flex-shrink: 0;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .sidebar-logo .logo-icon {
      font-size: 1.5rem;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
    }

    .sidebar-logo .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sidebar-close {
      display: none;
    }

    /* ── Nav ─────────────────────────────────────────── */
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: var(--border-color, rgba(255,255,255,0.1)); border-radius: 4px; }

    .sidebar-nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      color: var(--text-secondary, rgba(255,255,255,0.7));
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      position: relative;
      cursor: pointer;
    }

    .sidebar-nav-item:hover {
      background: var(--glass-hover, rgba(255,255,255,0.06));
      color: var(--text-primary, #fff);
      transform: translateX(2px);
    }

    .sidebar-nav-item.active {
      background: var(--primary-alpha, rgba(124,58,237,0.2));
      color: var(--primary, #7c3aed);
      font-weight: 600;
    }

    .sidebar-nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      border-radius: 0 4px 4px 0;
    }

    .nav-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      line-height: 1;
    }

    .nav-label {
      flex: 1;
    }

    /* ── Badge ───────────────────────────────────────── */
    .nav-badge {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 100px;
      flex-shrink: 0;
    }

    /* ── Footer ──────────────────────────────────────── */
    .sidebar-footer {
      padding: 12px;
      flex-shrink: 0;
      border-top: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    }

    .sidebar-user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 14px;
      background: var(--glass-subtle, rgba(255,255,255,0.04));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    }

    .sidebar-user-card .user-info {
      flex: 1;
      min-width: 0;
    }

    .sidebar-user-card .user-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-user-card .user-username {
      font-size: 0.75rem;
      color: var(--text-muted, rgba(255,255,255,0.45));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Mobile breakpoint ───────────────────────────── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar-close {
        display: flex;
      }

      #sidebar-container.sidebar-open .sidebar {
        transform: translateX(0);
      }

      #sidebar-container.sidebar-open .sidebar-overlay {
        display: block;
        opacity: 1;
      }
    }

    /* ── Avatar utility ──────────────────────────────── */
    .avatar {
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .avatar-sm { width: 36px; height: 36px; }
    .avatar-md { width: 44px; height: 44px; }
    .avatar-lg { width: 64px; height: 64px; }
    .avatar-xl { width: 96px; height: 96px; }
  `;
  document.head.appendChild(style);
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderSidebar(user) {
  injectSidebarStyles();

  const navItems = [
    { icon: '🏠', label: 'Home',           href: '/',                                     id: 'nav-home' },
    { icon: '🔍', label: 'Explore',        href: '/explore',                              id: 'nav-explore' },
    { icon: '📬', label: 'Messages',       href: '/messages',                             id: 'nav-messages',      badge: 'unreadMessages' },
    { icon: '🔔', label: 'Notifications',  href: '/notifications',                        id: 'nav-notifications', badge: 'unreadCount' },
    { icon: '👤', label: 'Profile',        href: `/profile/${user?.username || user?.uid}`, id: 'nav-profile' },
    { icon: '🚀', label: 'Upload Project', href: '/projects/upload',                      id: 'nav-upload' },
    { icon: '⚙️', label: 'Settings',       href: '/settings',                             id: 'nav-settings' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: '🛡️', label: 'Admin', href: '/admin', id: 'nav-admin' });
  }

  const currentPath = location.pathname;

  return `
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <aside class="sidebar glass" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="logo-icon">✦</span>
          <span class="logo-text">AETHER</span>
        </div>
        <button class="btn btn-icon btn-ghost sidebar-close" id="sidebar-toggle-close" aria-label="Close sidebar">✕</button>
      </div>

      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        ${navItems.map(item => `
          <a href="${item.href}"
             data-link
             class="sidebar-nav-item ${
               currentPath === item.href ||
               (item.href !== '/' && currentPath.startsWith(item.href))
                 ? 'active' : ''
             }"
             id="${item.id}"
             aria-label="${item.label}"
             ${currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)) ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
            ${item.badge ? `<span class="nav-badge" id="${item.badge}-badge" aria-live="polite" style="display:none">0</span>` : ''}
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user-card glass-subtle">
          <img src="${user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=7c3aed&color=fff`}"
               alt="${user?.displayName || 'User avatar'}"
               class="avatar avatar-sm"
               onerror="this.src='https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff'">
          <div class="user-info">
            <div class="user-name">${user?.displayName || 'User'}</div>
            <div class="user-username">@${user?.username || 'user'}</div>
          </div>
          <button class="btn btn-icon btn-ghost" id="sidebar-logout-btn" title="Logout" aria-label="Log out">↪</button>
        </div>
      </div>
    </aside>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSidebar() {
  // Logout
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
    try {
      await logout();
      showToast('Logged out successfully', 'success');
    } catch (e) {
      showToast('Logout failed', 'error');
    }
  });

  // Close button (mobile)
  document.getElementById('sidebar-toggle-close')?.addEventListener('click', () => {
    document.getElementById('sidebar-container')?.classList.remove('sidebar-open');
  });

  // Overlay click to close (mobile)
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar-container')?.classList.remove('sidebar-open');
  });

  // Badge update from store
  const updateBadges = () => {
    const state = store.getState();

    const notifBadge = document.getElementById('unreadCount-badge');
    if (notifBadge) {
      const n = state.unreadCount || 0;
      notifBadge.textContent = n > 99 ? '99+' : n;
      notifBadge.style.display = n > 0 ? 'flex' : 'none';
    }

    const msgBadge = document.getElementById('unreadMessages-badge');
    if (msgBadge) {
      const m = state.unreadMessages || 0;
      msgBadge.textContent = m > 99 ? '99+' : m;
      msgBadge.style.display = m > 0 ? 'flex' : 'none';
    }
  };

  store.subscribeAll(updateBadges);
  updateBadges();

  // Active nav item on route change
  eventBus.on(EVENTS.ROUTE_CHANGED, () => {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      const href = item.getAttribute('href');
      const isActive =
        location.pathname === href ||
        (href !== '/' && location.pathname.startsWith(href));
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  });
}
