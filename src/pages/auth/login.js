import { loginWithEmail, registerWithEmail, loginWithGoogle, loginWithGithub, resetPassword, checkUsernameAvailable } from '../../services/auth.service.js';
import { updateUserProfile } from '../../services/user.service.js';
import { router } from '../../core/router.js';
import { store } from '../../core/store.js';
import { showToast, showModal, debounce } from '../../utils/dom.js';
import { validateEmail, validatePassword, validateUsername } from '../../utils/validators.js';

export function render() {
  return `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="auth-orb auth-orb--1"></div>
        <div class="auth-orb auth-orb--2"></div>
        <div class="auth-orb auth-orb--3"></div>
      </div>
      <div class="auth-card glass">
        <div class="auth-logo">
          <div class="auth-logo__icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="url(#aetherGrad)"/>
              <path d="M20 8L28 22H12L20 8Z" fill="white" opacity="0.9"/>
              <path d="M20 32L12 18H28L20 32Z" fill="white" opacity="0.5"/>
              <defs>
                <linearGradient id="aetherGrad" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stop-color="#6C63FF"/>
                  <stop offset="100%" stop-color="#3ECFCF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="auth-logo__name">AETHER</h1>
          <p class="auth-logo__tagline">Connect. Learn. Grow.</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab auth-tab--active" data-tab="login">Login</button>
          <button class="auth-tab" data-tab="register">Sign Up</button>
          <span class="auth-tab-indicator"></span>
        </div>

        <div id="auth-error" class="auth-error" hidden></div>

        <!-- LOGIN FORM -->
        <form id="login-form" class="auth-form" novalidate>
          <div class="input-group">
            <label for="login-email">Email</label>
            <input id="login-email" type="email" placeholder="you@example.com" autocomplete="email" required/>
          </div>
          <div class="input-group">
            <label for="login-password">Password</label>
            <div class="input-password-wrap">
              <input id="login-password" type="password" placeholder="••••••••" autocomplete="current-password" required/>
              <button type="button" class="btn-show-password" data-target="login-password" aria-label="Toggle password">
                <svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <button type="button" id="forgot-password-btn" class="auth-link">Forgot Password?</button>
          </div>
          <button type="submit" id="login-btn" class="btn btn--primary btn--full">
            <span class="btn-text">Login</span>
            <span class="btn-spinner" hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </span>
          </button>
          <div class="auth-divider"><span>or continue with</span></div>
          <div class="auth-oauth">
            <button type="button" class="btn btn--oauth" id="login-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button type="button" class="btn btn--oauth" id="login-github-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>
        </form>

        <!-- REGISTER FORM -->
        <form id="register-form" class="auth-form" hidden novalidate>
          <div class="input-group">
            <label for="reg-name">Display Name</label>
            <input id="reg-name" type="text" placeholder="Your Name" autocomplete="name" required/>
          </div>
          <div class="input-group">
            <label for="reg-username">Username</label>
            <div class="input-username-wrap">
              <span class="input-prefix">@</span>
              <input id="reg-username" type="text" placeholder="username" autocomplete="username" required/>
              <span class="username-status" id="username-status"></span>
            </div>
            <small id="username-hint" class="input-hint"></small>
          </div>
          <div class="input-group">
            <label for="reg-email">Email</label>
            <input id="reg-email" type="email" placeholder="you@example.com" autocomplete="email" required/>
          </div>
          <div class="input-group">
            <label for="reg-password">Password</label>
            <div class="input-password-wrap">
              <input id="reg-password" type="password" placeholder="••••••••" autocomplete="new-password" required/>
              <button type="button" class="btn-show-password" data-target="reg-password" aria-label="Toggle password">
                <svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="password-strength" id="password-strength">
              <div class="strength-bar"><span id="strength-fill"></span></div>
              <span id="strength-label"></span>
            </div>
          </div>
          <div class="input-group">
            <label for="reg-confirm">Confirm Password</label>
            <div class="input-password-wrap">
              <input id="reg-confirm" type="password" placeholder="••••••••" autocomplete="new-password" required/>
              <button type="button" class="btn-show-password" data-target="reg-confirm" aria-label="Toggle password">
                <svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <label class="auth-checkbox">
            <input type="checkbox" id="reg-terms" required/>
            <span>I agree to the <a href="#" class="auth-link">Terms of Service</a> and <a href="#" class="auth-link">Privacy Policy</a></span>
          </label>
          <button type="submit" id="register-btn" class="btn btn--primary btn--full">
            <span class="btn-text">Create Account</span>
            <span class="btn-spinner" hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </span>
          </button>
          <div class="auth-divider"><span>or continue with</span></div>
          <div class="auth-oauth">
            <button type="button" class="btn btn--oauth" id="reg-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button type="button" class="btn btn--oauth" id="reg-github-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>
        </form>
      </div>

      <style>
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; background: var(--bg-primary, #0a0a0f); overflow: hidden; position: relative; }
        .auth-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; animation: orbFloat 8s ease-in-out infinite; }
        .auth-orb--1 { width: 400px; height: 400px; background: radial-gradient(circle, #6C63FF, transparent); top: -100px; left: -100px; animation-delay: 0s; }
        .auth-orb--2 { width: 350px; height: 350px; background: radial-gradient(circle, #3ECFCF, transparent); bottom: -80px; right: -80px; animation-delay: 3s; }
        .auth-orb--3 { width: 300px; height: 300px; background: radial-gradient(circle, #FF6584, transparent); top: 50%; left: 60%; animation-delay: 6s; }
        @keyframes orbFloat { 0%,100%{ transform: translate(0,0) scale(1); } 33%{ transform: translate(20px,-20px) scale(1.05); } 66%{ transform: translate(-15px,15px) scale(0.95); } }
        .auth-card { position: relative; z-index: 1; width: 100%; max-width: 420px; padding: 2rem; border-radius: 1.5rem; }
        .glass { background: rgba(255,255,255,0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
        .auth-logo { text-align: center; margin-bottom: 1.5rem; }
        .auth-logo__icon { display: inline-flex; margin-bottom: 0.5rem; }
        .auth-logo__name { font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg,#6C63FF,#3ECFCF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 4px; }
        .auth-logo__tagline { color: var(--text-secondary, #aaa); font-size: 0.85rem; margin-top: 0.25rem; }
        .auth-tabs { display: flex; position: relative; background: rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 0.25rem; margin-bottom: 1.25rem; gap: 0.25rem; }
        .auth-tab { flex: 1; padding: 0.6rem; border: none; background: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; font-size: 0.9rem; color: var(--text-secondary, #aaa); transition: color 0.2s; }
        .auth-tab--active { background: linear-gradient(135deg,#6C63FF,#3ECFCF); color: #fff; }
        .auth-error { background: rgba(255,80,80,0.15); border: 1px solid rgba(255,80,80,0.3); border-radius: 0.5rem; padding: 0.75rem 1rem; color: #ff6b6b; font-size: 0.875rem; margin-bottom: 1rem; }
        .auth-form { display: flex; flex-direction: column; gap: 1rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .input-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary, #aaa); }
        .input-group input { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 0.6rem; padding: 0.7rem 1rem; color: var(--text-primary, #fff); font-size: 0.95rem; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
        .input-group input:focus { outline: none; border-color: #6C63FF; background: rgba(108,99,255,0.08); }
        .input-password-wrap { position: relative; }
        .input-password-wrap input { padding-right: 3rem; }
        .btn-show-password { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-secondary, #aaa); padding: 0; display: flex; }
        .input-username-wrap { display: flex; align-items: center; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 0.6rem; overflow: hidden; }
        .input-prefix { padding: 0 0.5rem 0 1rem; color: var(--text-secondary,#aaa); font-size: 0.95rem; }
        .input-username-wrap input { background: none; border: none; padding-left: 0; flex: 1; }
        .input-username-wrap input:focus { border: none; background: none; outline: none; }
        .username-status { padding-right: 0.75rem; font-size: 1rem; }
        .input-hint { font-size: 0.78rem; color: var(--text-secondary,#aaa); }
        .password-strength { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
        .strength-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
        #strength-fill { display: block; height: 100%; width: 0; border-radius: 2px; transition: width 0.3s, background 0.3s; }
        #strength-label { font-size: 0.75rem; font-weight: 600; min-width: 45px; }
        .auth-checkbox { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary,#aaa); cursor: pointer; line-height: 1.5; }
        .auth-checkbox input { margin-top: 0.15rem; accent-color: #6C63FF; }
        .auth-link { background: none; border: none; color: #6C63FF; cursor: pointer; padding: 0; font-size: 0.8rem; text-decoration: underline; }
        a.auth-link { display: inline; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.6rem; font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; transition: all 0.2s; }
        .btn--primary { background: linear-gradient(135deg,#6C63FF,#3ECFCF); color: #fff; box-shadow: 0 4px 15px rgba(108,99,255,0.4); }
        .btn--primary:hover { box-shadow: 0 6px 20px rgba(108,99,255,0.6); transform: translateY(-1px); }
        .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn--full { width: 100%; }
        .btn--oauth { flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: var(--text-primary,#fff); font-size: 0.875rem; padding: 0.65rem; }
        .btn--oauth:hover { background: rgba(255,255,255,0.12); }
        .auth-divider { display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary,#aaa); font-size: 0.8rem; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .auth-oauth { display: flex; gap: 0.75rem; }
        .btn-spinner.spin, .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `;
}

export function init() {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorEl = document.getElementById('auth-error');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function clearError() { errorEl.hidden = true; errorEl.textContent = ''; }

  function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    btn.disabled = loading;
    if (text) text.hidden = loading;
    if (spinner) spinner.hidden = !loading;
  }

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      clearError();
      tabs.forEach(t => t.classList.remove('auth-tab--active'));
      tab.classList.add('auth-tab--active');
      const target = tab.dataset.tab;
      loginForm.hidden = target !== 'login';
      registerForm.hidden = target !== 'register';
    });
  });

  // Password show/hide
  document.querySelectorAll('.btn-show-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Password strength meter
  const regPassword = document.getElementById('reg-password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');

  function updateStrength(value) {
    const result = validatePassword(value);
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;

    const pct = [0, 25, 50, 75, 100][strength];
    const colors = ['', '#ff4d4d', '#ff9933', '#ffcc00', '#00cc88'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    strengthFill.style.width = pct + '%';
    strengthFill.style.background = colors[strength] || '';
    strengthLabel.textContent = labels[strength] || '';
    strengthLabel.style.color = colors[strength] || '';
  }

  if (regPassword) {
    regPassword.addEventListener('input', () => updateStrength(regPassword.value));
  }

  // Username availability check
  const usernameInput = document.getElementById('reg-username');
  const usernameStatus = document.getElementById('username-status');
  const usernameHint = document.getElementById('username-hint');
  let usernameAvailable = false;

  const checkUsername = debounce(async (value) => {
    if (!value || value.length < 3) {
      usernameStatus.textContent = '';
      usernameHint.textContent = 'Min 3 characters';
      usernameAvailable = false;
      return;
    }
    const validation = validateUsername(value);
    if (!validation.valid) {
      usernameStatus.textContent = '✗';
      usernameStatus.style.color = '#ff4d4d';
      usernameHint.textContent = validation.message || 'Invalid username';
      usernameAvailable = false;
      return;
    }
    usernameStatus.textContent = '⟳';
    usernameStatus.style.color = '#aaa';
    usernameHint.textContent = 'Checking...';
    try {
      const available = await checkUsernameAvailable(value);
      usernameAvailable = available;
      usernameStatus.textContent = available ? '✓' : '✗';
      usernameStatus.style.color = available ? '#00cc88' : '#ff4d4d';
      usernameHint.textContent = available ? 'Username available!' : 'Username taken';
    } catch {
      usernameStatus.textContent = '';
      usernameHint.textContent = 'Could not check availability';
    }
  }, 300);

  if (usernameInput) {
    usernameInput.addEventListener('input', () => checkUsername(usernameInput.value.trim()));
  }

  // Login form submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!validateEmail(email).valid) { showError('Please enter a valid email address.'); return; }
    if (!password) { showError('Please enter your password.'); return; }
    const btn = document.getElementById('login-btn');
    setLoading(btn, true);
    try {
      await loginWithEmail(email, password);
      router.navigate('/');
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      setLoading(btn, false);
    }
  });

  // Register form submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = regPassword.value;
    const confirm = document.getElementById('reg-confirm').value;
    const terms = document.getElementById('reg-terms').checked;

    if (!name) { showError('Please enter your display name.'); return; }
    const unameVal = validateUsername(username);
    if (!unameVal.valid) { showError(unameVal.message || 'Invalid username.'); return; }
    if (!usernameAvailable) { showError('That username is not available.'); return; }
    if (!validateEmail(email).valid) { showError('Please enter a valid email address.'); return; }
    const pwdVal = validatePassword(password);
    if (!pwdVal.valid) { showError(pwdVal.message || 'Password is too weak.'); return; }
    if (password !== confirm) { showError('Passwords do not match.'); return; }
    if (!terms) { showError('Please accept the Terms of Service.'); return; }

    const btn = document.getElementById('register-btn');
    setLoading(btn, true);
    try {
      const user = await registerWithEmail(email, password, name);
      await updateUserProfile(user.uid, { username, displayName: name });
      router.navigate('/auth/onboarding');
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      setLoading(btn, false);
    }
  });

  // Google OAuth
  async function handleOAuth(provider) {
    clearError();
    try {
      const fn = provider === 'google' ? loginWithGoogle : loginWithGithub;
      await fn();
      const { user } = store.getState();
      if (user && !user.onboardingComplete) {
        router.navigate('/auth/onboarding');
      } else {
        router.navigate('/');
      }
    } catch (err) {
      showError(friendlyAuthError(err));
    }
  }

  document.getElementById('login-google-btn').addEventListener('click', () => handleOAuth('google'));
  document.getElementById('login-github-btn').addEventListener('click', () => handleOAuth('github'));
  document.getElementById('reg-google-btn').addEventListener('click', () => handleOAuth('google'));
  document.getElementById('reg-github-btn').addEventListener('click', () => handleOAuth('github'));

  // Forgot password
  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    const content = `
      <div style="padding:1.5rem;min-width:300px">
        <h3 style="margin:0 0 1rem">Reset Password</h3>
        <p style="font-size:0.875rem;color:#aaa;margin:0 0 1rem">Enter your email and we'll send a reset link.</p>
        <input id="forgot-email" type="email" placeholder="you@example.com" style="width:100%;box-sizing:border-box;padding:0.7rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#fff;font-size:0.95rem;margin-bottom:1rem"/>
        <button id="forgot-submit" class="btn btn--primary btn--full">Send Reset Link</button>
        <p id="forgot-msg" style="font-size:0.8rem;margin-top:0.75rem;text-align:center"></p>
      </div>`;
    const overlay = showModal(content, { closeOnBackdrop: true });
    document.getElementById('forgot-submit').addEventListener('click', async () => {
      const email = document.getElementById('forgot-email').value.trim();
      if (!validateEmail(email).valid) { document.getElementById('forgot-msg').textContent = 'Enter a valid email.'; document.getElementById('forgot-msg').style.color = '#ff6b6b'; return; }
      try {
        await resetPassword(email);
        document.getElementById('forgot-msg').textContent = 'Reset link sent! Check your email.';
        document.getElementById('forgot-msg').style.color = '#00cc88';
      } catch (err) {
        document.getElementById('forgot-msg').textContent = friendlyAuthError(err);
        document.getElementById('forgot-msg').style.color = '#ff6b6b';
      }
    });
  });
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/cancelled-popup-request': 'Another sign-in is in progress.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
  };
  return map[code] || err?.message || 'An unexpected error occurred.';
}
