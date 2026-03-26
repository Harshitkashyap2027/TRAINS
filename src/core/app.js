import { initFirebase } from '../services/firebase.js';
import { onAuthStateChange } from '../services/auth.service.js';
import { getUserProfile } from '../services/user.service.js';
import { router } from './router.js';
import { store } from './store.js';
import { eventBus, EVENTS } from './eventBus.js';
import { renderSidebar } from '../components/layout/sidebar.js';
import { renderBottomNav } from '../components/layout/bottomNav.js';
import { renderTopbar } from '../components/layout/topbar.js';
import { showToast } from '../utils/dom.js';

async function initApp() {
  // Initialize Firebase
  initFirebase();

  // Initialize theme
  const savedTheme = localStorage.getItem('aether-theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  store.setTheme(savedTheme);

  // Show loading screen
  const loadingScreen = document.getElementById('loading-screen');
  const appShell = document.getElementById('app-shell');

  // Auth state observer
  onAuthStateChange(async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Get user profile from Firestore
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL || null,
            role: 'user',
            createdAt: new Date(),
          };
        }
        store.setUser({ ...profile, uid: firebaseUser.uid });

        // Render authenticated layout
        renderAuthenticatedLayout(profile);

        // Check if needs onboarding
        if (!profile.onboardingComplete) {
          router.navigate('/auth/onboarding', false);
        } else if (location.pathname === '/auth/login' || location.pathname === '/') {
          router.navigate('/', false);
        } else {
          router.navigate(location.pathname, false);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        store.setState({ isAuthenticated: false, isLoading: false });
        renderUnauthenticatedLayout();
        router.navigate('/auth/login', false);
      }
    } else {
      store.clearUser();
      renderUnauthenticatedLayout();
      if (location.pathname !== '/auth/login') {
        router.navigate('/auth/login', false);
      } else {
        router.navigate('/auth/login', false);
      }
    }

    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
    if (appShell) appShell.style.display = 'flex';
  });

  // Initialize router
  router.init();

  // Theme change listener
  eventBus.on(EVENTS.THEME_CHANGED, (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aether-theme', theme);
    store.setTheme(theme);
  });
}

function renderAuthenticatedLayout(user) {
  const appShell = document.getElementById('app-shell');
  if (!appShell) return;
  appShell.innerHTML = `
    <div id="sidebar-container">${renderSidebar(user)}</div>
    <div class="main-content" id="main-content">
      <div id="topbar-container">${renderTopbar(user)}</div>
      <div id="app-root" class="page-wrapper"></div>
    </div>
    <div id="bottomnav-container">${renderBottomNav()}</div>
    <div id="modal-root"></div>
    <div id="toast-container"></div>
  `;

  // Add sidebar toggle for mobile
  document.addEventListener('click', (e) => {
    if (e.target.id === 'sidebar-toggle') {
      document.getElementById('sidebar-container')?.classList.toggle('sidebar-open');
    }
    if (e.target.id === 'sidebar-overlay') {
      document.getElementById('sidebar-container')?.classList.remove('sidebar-open');
    }
  });
}

function renderUnauthenticatedLayout() {
  const appShell = document.getElementById('app-shell');
  if (!appShell) return;
  appShell.innerHTML = `
    <div id="app-root" class="auth-layout"></div>
    <div id="modal-root"></div>
    <div id="toast-container"></div>
  `;
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
