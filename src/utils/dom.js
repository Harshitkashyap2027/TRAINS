// Complete DOM utility functions
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'dataset') Object.entries(val).forEach(([dk, dv]) => el.dataset[dk] = dv);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

export function setHTML(element, html) {
  if (typeof element === 'string') element = document.querySelector(element);
  if (element) element.innerHTML = html;
}

export function addRipple(element) {
  element.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    ripple.className = 'ripple-effect';
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(c);
    return c;
  })();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-up`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showModal(contentHTML, options = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay animate-fade-in';
  overlay.innerHTML = `<div class="modal-container glass animate-scale-in">${contentHTML}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !options.persistent) closeModal(overlay);
  });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return overlay;
}

export function closeModal(overlay) {
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.remove();
    document.body.style.overflow = '';
  }, 300);
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) { fn(...args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
  };
}

export function infiniteScroll(container, callback, threshold = 200) {
  const handler = throttle(() => {
    const { scrollTop, scrollHeight, clientHeight } = container === document.documentElement ? document.documentElement : container;
    if (scrollHeight - scrollTop - clientHeight < threshold) callback();
  }, 500);
  (container === document.documentElement ? window : container).addEventListener('scroll', handler);
  return () => (container === document.documentElement ? window : container).removeEventListener('scroll', handler);
}

export function formatHTML(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] !== undefined ? String(values[i]).replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''), '');
}

export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function toggleClass(el, className) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (el) el.classList.toggle(className);
}

export function addClass(el, ...classes) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (el) el.classList.add(...classes);
}

export function removeClass(el, ...classes) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (el) el.classList.remove(...classes);
}

export function waitFor(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error(`Element ${selector} not found`)); }, timeout);
  });
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'success')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied!', 'success');
  });
}

export function smoothScrollTo(target, offset = 0) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}
