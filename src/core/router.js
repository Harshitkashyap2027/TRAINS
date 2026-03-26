import { store } from './store.js';
import { eventBus, EVENTS } from './eventBus.js';
import { showToast } from '../utils/dom.js';

// Route definitions
const routes = [
  { path: '/', page: 'home', auth: true },
  { path: '/explore', page: 'explore', auth: true },
  { path: '/notifications', page: 'notifications', auth: true },
  { path: '/profile/:username', page: 'userProfile', auth: true },
  { path: '/settings', page: 'settings', auth: true },
  { path: '/projects/upload', page: 'upload', auth: true },
  { path: '/projects/:id', page: 'projectView', auth: true },
  { path: '/messages', page: 'inbox', auth: true },
  { path: '/messages/:chatId', page: 'chatRoom', auth: true },
  { path: '/admin', page: 'dashboard', auth: true, admin: true },
  { path: '/admin/moderation', page: 'moderation', auth: true, admin: true },
  { path: '/auth/login', page: 'login', auth: false },
  { path: '/auth/onboarding', page: 'onboarding', auth: true },
];

// Page imports (lazy loaded)
const pageModules = {
  home: () => import('../pages/main/home.js'),
  explore: () => import('../pages/main/explore.js'),
  notifications: () => import('../pages/main/notifications.js'),
  userProfile: () => import('../pages/profile/userProfile.js'),
  settings: () => import('../pages/profile/settings.js'),
  upload: () => import('../pages/projects/upload.js'),
  projectView: () => import('../pages/projects/projectView.js'),
  inbox: () => import('../pages/messages/inbox.js'),
  chatRoom: () => import('../pages/messages/chatRoom.js'),
  dashboard: () => import('../pages/admin/dashboard.js'),
  moderation: () => import('../pages/admin/moderation.js'),
  login: () => import('../pages/auth/login.js'),
  onboarding: () => import('../pages/auth/onboarding.js'),
};

class Router {
  constructor() {
    this.currentRoute = null;
    this.currentModule = null;
    this.params = {};
    this.isTransitioning = false;
  }

  init() {
    window.addEventListener('popstate', () => this.navigate(location.pathname, false));
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href') || link.dataset.href);
      }
    });
    this.navigate(location.pathname, false);
  }

  matchRoute(path) {
    for (const route of routes) {
      const paramNames = [];
      const regexStr = route.path.replace(/:([^/]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
      const regex = new RegExp(`^${regexStr}$`);
      const match = path.match(regex);
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => params[name] = decodeURIComponent(match[i + 1]));
        return { ...route, params };
      }
    }
    return null;
  }

  async navigate(path, pushState = true) {
    if (this.isTransitioning) return;
    path = path.split('?')[0];
    const route = this.matchRoute(path);
    if (!route) {
      this.navigate('/', pushState);
      return;
    }

    const state = store.getState();

    // Auth guard
    if (route.auth && !state.isAuthenticated) {
      this.navigate('/auth/login', pushState);
      return;
    }

    // Redirect logged-in users away from auth pages
    if (!route.auth && state.isAuthenticated) {
      this.navigate('/', pushState);
      return;
    }

    // Admin guard
    if (route.admin && (!state.user || state.user.role !== 'admin')) {
      showToast('Admin access required', 'error');
      this.navigate('/', pushState);
      return;
    }

    if (pushState) history.pushState({}, '', path);
    this.params = route.params || {};
    this.currentRoute = route;
    store.setState({ currentRoute: route });
    eventBus.emit(EVENTS.ROUTE_CHANGED, route);
    await this.loadPage(route);
  }

  async loadPage(route) {
    this.isTransitioning = true;
    const appRoot = document.getElementById('app-root');
    if (!appRoot) { this.isTransitioning = false; return; }

    // Exit animation
    appRoot.classList.add('page-exit');
    await new Promise(r => setTimeout(r, 200));

    appRoot.innerHTML = '<div class="page-loading"><div class="loading-spinner"></div></div>';
    appRoot.classList.remove('page-exit');

    try {
      const loader = pageModules[route.page];
      if (!loader) throw new Error(`No module for page: ${route.page}`);
      const module = await loader();
      const html = await module.render(this.params);
      appRoot.innerHTML = html;
      appRoot.classList.add('page-enter');
      requestAnimationFrame(() => {
        appRoot.classList.add('page-enter-active');
        setTimeout(() => appRoot.classList.remove('page-enter', 'page-enter-active'), 400);
      });
      if (module.init) await module.init(this.params);
    } catch (err) {
      console.error('Page load error:', err);
      appRoot.innerHTML = `<div class="error-page"><h2>Page not found</h2><button class="btn btn-primary" data-link href="/">Go Home</button></div>`;
    }

    this.isTransitioning = false;
    window.scrollTo(0, 0);
  }

  getParams() { return this.params; }
  getCurrentRoute() { return this.currentRoute; }
}

export const router = new Router();
