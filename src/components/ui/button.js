import { addRipple } from '../../utils/dom.js';

// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectButtonStyles() {
  if (document.getElementById('button-component-styles')) return;
  const style = document.createElement('style');
  style.id = 'button-component-styles';
  style.textContent = `
    /* ── Base button ─────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      border: none;
      border-radius: 10px;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .btn:focus-visible {
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.35));
    }

    .btn:disabled,
    .btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Sizes ───────────────────────────────────────── */
    .btn-sm  { padding: 6px 14px;  font-size: 0.8rem;  border-radius: 8px;  }
    .btn-md  { padding: 10px 20px; font-size: 0.9rem;  border-radius: 10px; }
    .btn-lg  { padding: 14px 28px; font-size: 1rem;    border-radius: 12px; }

    /* ── Types ───────────────────────────────────────── */
    .btn-primary {
      background: var(--gradient-primary, linear-gradient(135deg,#7c3aed,#3b82f6));
      color: #fff;
      box-shadow: 0 4px 14px rgba(124,58,237,0.35);
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(124,58,237,0.5);
    }
    .btn-primary:active { transform: translateY(0); }

    .btn-secondary {
      background: var(--glass-subtle, rgba(255,255,255,0.07));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      color: var(--text-primary, #fff);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--glass-hover, rgba(255,255,255,0.12));
      border-color: var(--primary, #7c3aed);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary, rgba(255,255,255,0.7));
    }
    .btn-ghost:hover:not(:disabled) {
      background: var(--glass-subtle, rgba(255,255,255,0.06));
      color: var(--text-primary, #fff);
    }

    .btn-danger {
      background: linear-gradient(135deg,#ef4444,#dc2626);
      color: #fff;
      box-shadow: 0 4px 14px rgba(239,68,68,0.35);
    }
    .btn-danger:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(239,68,68,0.5);
    }

    .btn-icon {
      width: 38px;
      height: 38px;
      padding: 0;
      border-radius: 50%;
      font-size: 1rem;
    }

    .btn-icon.btn-sm { width: 30px; height: 30px; font-size: 0.85rem; }
    .btn-icon.btn-lg { width: 48px; height: 48px; font-size: 1.2rem;  }

    /* ── Loading state ───────────────────────────────── */
    .btn-loading .btn-label { opacity: 0; }
    .btn-loading::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: btn-spin 0.7s linear infinite;
    }

    @keyframes btn-spin {
      to { transform: rotate(360deg); }
    }

    /* ── Icon inside btn ─────────────────────────────── */
    .btn-icon-el {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: 1em;
    }

    /* ── Label wrapper ───────────────────────────────── */
    .btn-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.15s ease;
    }

    /* ── Ripple ──────────────────────────────────────── */
    .ripple-effect {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      transform: scale(0);
      animation: ripple-anim 0.5s ease-out forwards;
      pointer-events: none;
    }
    @keyframes ripple-anim {
      to { transform: scale(4); opacity: 0; }
    }

    /* ── Tooltip (icon buttons) ──────────────────────── */
    .btn-with-tooltip {
      position: relative;
    }
    .btn-with-tooltip::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%) scale(0.85);
      background: var(--bg-card, #1a1a2e);
      color: var(--text-primary, #fff);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      z-index: 100;
    }
    .btn-with-tooltip:hover::before {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }

    /* ── Toggle button ───────────────────────────────── */
    .btn-toggle {
      background: var(--glass-subtle, rgba(255,255,255,0.07));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      color: var(--text-secondary, rgba(255,255,255,0.7));
    }
    .btn-toggle.toggle-on {
      background: var(--primary-alpha, rgba(124,58,237,0.2));
      border-color: var(--primary, #7c3aed);
      color: var(--primary, #7c3aed);
    }
  `;
  document.head.appendChild(style);
}

// ─── createButton ─────────────────────────────────────────────────────────────

/**
 * Create a fully-featured button element.
 * @param {string} text - Button label text
 * @param {object} options
 * @param {string}   [options.type='primary']   - 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
 * @param {string}   [options.size='md']        - 'sm' | 'md' | 'lg'
 * @param {boolean}  [options.loading=false]    - Show loading spinner
 * @param {boolean}  [options.disabled=false]   - Disabled state
 * @param {string}   [options.icon]             - Emoji / text icon (prepended)
 * @param {string}   [options.iconAfter]        - Icon appended after label
 * @param {Function} [options.onClick]          - Click handler
 * @param {string}   [options.id]               - Element id attribute
 * @param {string}   [options.className]        - Extra CSS classes
 * @param {boolean}  [options.ripple=true]      - Ripple click effect
 * @param {string}   [options.href]             - If set, renders an <a> tag
 * @param {string}   [options.ariaLabel]        - aria-label override
 * @returns {HTMLButtonElement|HTMLAnchorElement}
 */
export function createButton(text, options = {}) {
  injectButtonStyles();

  const {
    type     = 'primary',
    size     = 'md',
    loading  = false,
    disabled = false,
    icon     = null,
    iconAfter = null,
    onClick  = null,
    id       = null,
    className = '',
    ripple   = true,
    href     = null,
    ariaLabel = null,
  } = options;

  const tag = href ? 'a' : 'button';
  const btn = document.createElement(tag);

  btn.className = ['btn', `btn-${type}`, `btn-${size}`, className].filter(Boolean).join(' ');
  if (id) btn.id = id;
  if (href) btn.href = href;
  if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
  if (disabled) btn.disabled = true;

  // Inner label wrapper
  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn-label';
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'btn-icon-el';
    iconEl.textContent = icon;
    iconEl.setAttribute('aria-hidden', 'true');
    labelSpan.appendChild(iconEl);
  }
  labelSpan.appendChild(document.createTextNode(text));
  if (iconAfter) {
    const iconEl = document.createElement('span');
    iconEl.className = 'btn-icon-el';
    iconEl.textContent = iconAfter;
    iconEl.setAttribute('aria-hidden', 'true');
    labelSpan.appendChild(iconEl);
  }
  btn.appendChild(labelSpan);

  if (loading) btn.classList.add('btn-loading');
  if (ripple && !disabled) addRipple(btn);
  if (onClick) btn.addEventListener('click', onClick);

  return btn;
}

// ─── createIconButton ─────────────────────────────────────────────────────────

/**
 * Create an icon-only button with a tooltip.
 * @param {string}   icon    - Emoji or character
 * @param {string}   label   - Accessible label and tooltip text
 * @param {Function} onClick - Click handler
 * @param {object}   options - type, size, id, className, disabled
 * @returns {HTMLButtonElement}
 */
export function createIconButton(icon, label, onClick, options = {}) {
  injectButtonStyles();

  const {
    type      = 'ghost',
    size      = 'md',
    id        = null,
    className = '',
    disabled  = false,
  } = options;

  const btn = document.createElement('button');
  btn.className = ['btn', 'btn-icon', `btn-${type}`, `btn-${size}`, 'btn-with-tooltip', className]
    .filter(Boolean).join(' ');
  btn.setAttribute('aria-label', label);
  btn.setAttribute('data-tooltip', label);
  btn.setAttribute('type', 'button');
  btn.textContent = icon;
  if (id) btn.id = id;
  if (disabled) btn.disabled = true;
  if (onClick) btn.addEventListener('click', onClick);
  addRipple(btn);
  return btn;
}

// ─── createLoadingButton ──────────────────────────────────────────────────────

/**
 * Button that automatically shows a loading state while an async function runs.
 * @param {string}   text    - Button label
 * @param {Function} asyncFn - Async function to run on click
 * @param {object}   options - Same as createButton options
 * @returns {HTMLButtonElement}
 */
export function createLoadingButton(text, asyncFn, options = {}) {
  const btn = createButton(text, { ...options, ripple: false });

  btn.addEventListener('click', async (e) => {
    if (btn.classList.contains('btn-loading')) return;
    showButtonLoading(btn);
    try {
      await asyncFn(e);
    } finally {
      hideButtonLoading(btn);
    }
  });

  return btn;
}

// ─── showButtonLoading / hideButtonLoading ────────────────────────────────────

/**
 * Put a button into loading state.
 * @param {HTMLButtonElement} btn
 */
export function showButtonLoading(btn) {
  if (!btn) return;
  btn.classList.add('btn-loading');
  btn.disabled = true;
  btn._prevAriaLabel = btn.getAttribute('aria-label');
  btn.setAttribute('aria-label', 'Loading…');
}

/**
 * Remove loading state from a button.
 * @param {HTMLButtonElement} btn
 */
export function hideButtonLoading(btn) {
  if (!btn) return;
  btn.classList.remove('btn-loading');
  btn.disabled = false;
  if (btn._prevAriaLabel !== undefined) {
    btn.setAttribute('aria-label', btn._prevAriaLabel);
    delete btn._prevAriaLabel;
  }
}

// ─── createToggleButton ───────────────────────────────────────────────────────

/**
 * Create a button that toggles between on/off states.
 * @param {string}   onLabel  - Label shown in ON state
 * @param {string}   offLabel - Label shown in OFF state
 * @param {boolean}  isOn     - Initial state
 * @param {Function} onChange - Called with new state (boolean)
 * @param {object}   options  - size, id, className, icons
 * @returns {HTMLButtonElement}
 */
export function createToggleButton(onLabel, offLabel, isOn = false, onChange = null, options = {}) {
  injectButtonStyles();

  const {
    size      = 'md',
    id        = null,
    className = '',
    onIcon    = null,
    offIcon   = null,
  } = options;

  let state = isOn;

  const btn = document.createElement('button');
  btn.setAttribute('type', 'button');
  btn.className = ['btn', 'btn-toggle', `btn-${size}`, state ? 'toggle-on' : '', className]
    .filter(Boolean).join(' ');
  if (id) btn.id = id;

  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn-label';
  btn.appendChild(labelSpan);

  const update = () => {
    btn.classList.toggle('toggle-on', state);
    const icon  = state ? (onIcon  || '') : (offIcon  || '');
    const label = state ? onLabel : offLabel;
    labelSpan.textContent = icon ? `${icon} ${label}` : label;
    btn.setAttribute('aria-pressed', String(state));
  };

  update();

  btn.addEventListener('click', () => {
    state = !state;
    update();
    if (onChange) onChange(state);
  });

  addRipple(btn);

  /** Programmatically set state */
  btn.setState = (newState) => {
    state = newState;
    update();
  };

  return btn;
}
