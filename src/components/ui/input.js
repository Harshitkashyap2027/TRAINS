import { debounce } from '../../utils/dom.js';

// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectInputStyles() {
  if (document.getElementById('input-component-styles')) return;
  const style = document.createElement('style');
  style.id = 'input-component-styles';
  style.textContent = `
    /* ── Field wrapper ───────────────────────────────── */
    .field-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }

    .field-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, rgba(255,255,255,0.7));
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .field-required { color: var(--danger, #ef4444); }

    /* ── Input wrapper ───────────────────────────────── */
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-field-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, rgba(255,255,255,0.35));
      pointer-events: none;
      font-size: 1rem;
      z-index: 1;
    }

    /* ── Input / Textarea ────────────────────────────── */
    .field-input,
    .field-textarea {
      width: 100%;
      background: var(--glass-subtle, rgba(255,255,255,0.06));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      border-radius: 10px;
      color: var(--text-primary, #fff);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    .field-input {
      padding: 11px 14px;
      height: 44px;
    }

    .field-input.has-icon { padding-left: 40px; }

    .field-textarea {
      padding: 12px 14px;
      resize: vertical;
      min-height: 100px;
    }

    .field-input::placeholder,
    .field-textarea::placeholder {
      color: var(--text-muted, rgba(255,255,255,0.3));
    }

    .field-input:focus,
    .field-textarea:focus {
      border-color: var(--primary, #7c3aed);
      background: var(--glass-hover, rgba(255,255,255,0.09));
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.15));
    }

    /* ── Validation states ───────────────────────────── */
    .field-input.has-error,
    .field-textarea.has-error {
      border-color: var(--danger, #ef4444);
      box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
    }

    .field-input.has-success,
    .field-textarea.has-success {
      border-color: var(--success, #10b981);
      box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
    }

    .field-hint {
      font-size: 0.78rem;
      color: var(--text-muted, rgba(255,255,255,0.4));
    }

    .field-error-msg {
      font-size: 0.78rem;
      color: var(--danger, #ef4444);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .field-success-msg {
      font-size: 0.78rem;
      color: var(--success, #10b981);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Char counter ────────────────────────────────── */
    .field-char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: var(--text-muted, rgba(255,255,255,0.35));
      transition: color 0.2s ease;
    }

    .field-char-counter.warn  { color: var(--warning, #f59e0b); }
    .field-char-counter.over  { color: var(--danger,  #ef4444); }

    /* ── Search bar ──────────────────────────────────── */
    .search-bar-wrapper {
      position: relative;
      width: 100%;
    }

    .search-bar-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, rgba(255,255,255,0.35));
      pointer-events: none;
      font-size: 1rem;
    }

    .search-bar-input {
      width: 100%;
      padding: 10px 40px 10px 42px;
      background: var(--glass-subtle, rgba(255,255,255,0.06));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      border-radius: 100px;
      color: var(--text-primary, #fff);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-bar-input::placeholder { color: var(--text-muted, rgba(255,255,255,0.3)); }

    .search-bar-input:focus {
      border-color: var(--primary, #7c3aed);
      background: var(--glass-hover, rgba(255,255,255,0.09));
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.15));
    }

    .search-bar-clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted, rgba(255,255,255,0.4));
      cursor: pointer;
      font-size: 1rem;
      display: none;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      transition: background 0.2s ease;
    }

    .search-bar-clear:hover { background: var(--glass-hover, rgba(255,255,255,0.08)); }
    .search-bar-clear.visible { display: flex; }

    /* ── Tag input ───────────────────────────────────── */
    .tag-input-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      padding: 8px 10px;
      background: var(--glass-subtle, rgba(255,255,255,0.06));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      border-radius: 10px;
      cursor: text;
      min-height: 44px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .tag-input-wrapper:focus-within {
      border-color: var(--primary, #7c3aed);
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.15));
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      background: var(--primary-alpha, rgba(124,58,237,0.2));
      border: 1px solid var(--primary, #7c3aed);
      border-radius: 100px;
      color: var(--primary, #7c3aed);
      font-size: 0.82rem;
      font-weight: 500;
    }

    .tag-chip-remove {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0;
      display: flex;
      align-items: center;
      opacity: 0.7;
    }

    .tag-chip-remove:hover { opacity: 1; }

    .tag-text-input {
      border: none;
      background: transparent;
      color: var(--text-primary, #fff);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      min-width: 80px;
      flex: 1;
    }

    .tag-text-input::placeholder { color: var(--text-muted, rgba(255,255,255,0.3)); }

    /* ── File input / drop zone ──────────────────────── */
    .file-drop-zone {
      border: 2px dashed var(--glass-border, rgba(255,255,255,0.15));
      border-radius: 12px;
      padding: 32px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--glass-subtle, rgba(255,255,255,0.03));
      position: relative;
    }

    .file-drop-zone:hover,
    .file-drop-zone.drag-over {
      border-color: var(--primary, #7c3aed);
      background: var(--primary-alpha, rgba(124,58,237,0.07));
    }

    .file-drop-zone input[type="file"] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .file-drop-zone-icon { font-size: 2.5rem; margin-bottom: 8px; }

    .file-drop-zone-text {
      color: var(--text-secondary, rgba(255,255,255,0.6));
      font-size: 0.9rem;
    }

    .file-drop-zone-text strong { color: var(--primary, #7c3aed); }

    .file-preview-img {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      margin-top: 12px;
      object-fit: cover;
    }

    .file-preview-name {
      font-size: 0.82rem;
      color: var(--text-secondary, rgba(255,255,255,0.6));
      margin-top: 8px;
    }

    /* ── Select ──────────────────────────────────────── */
    .styled-select {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      padding: 11px 36px 11px 14px;
      background: var(--glass-subtle, rgba(255,255,255,0.06))
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")
                  no-repeat right 14px center;
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      border-radius: 10px;
      color: var(--text-primary, #fff);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .styled-select:focus {
      border-color: var(--primary, #7c3aed);
      box-shadow: 0 0 0 3px var(--primary-alpha, rgba(124,58,237,0.15));
    }

    .styled-select option {
      background: var(--bg-card, #1a1a2e);
      color: var(--text-primary, #fff);
    }

    /* ── Toggle switch ───────────────────────────────── */
    .toggle-switch-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .toggle-switch-label {
      font-size: 0.9rem;
      color: var(--text-secondary, rgba(255,255,255,0.7));
      flex: 1;
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }

    .toggle-track {
      position: absolute;
      inset: 0;
      background: var(--glass-border, rgba(255,255,255,0.15));
      border-radius: 100px;
      transition: background 0.2s ease;
      cursor: pointer;
    }

    .toggle-track::after {
      content: '';
      position: absolute;
      left: 3px;
      top: 3px;
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    .toggle-switch input:checked + .toggle-track {
      background: var(--primary, #7c3aed);
    }

    .toggle-switch input:checked + .toggle-track::after {
      transform: translateX(20px);
    }

    /* ── Radio group ─────────────────────────────────── */
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
      background: var(--glass-subtle, rgba(255,255,255,0.04));
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .radio-option:hover {
      border-color: var(--primary, #7c3aed);
      background: var(--primary-alpha, rgba(124,58,237,0.07));
    }

    .radio-option.selected {
      border-color: var(--primary, #7c3aed);
      background: var(--primary-alpha, rgba(124,58,237,0.15));
    }

    .radio-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--glass-border, rgba(255,255,255,0.3));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.2s ease;
    }

    .radio-option.selected .radio-dot {
      border-color: var(--primary, #7c3aed);
    }

    .radio-dot::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary, #7c3aed);
      transform: scale(0);
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
    }

    .radio-option.selected .radio-dot::after { transform: scale(1); }

    .radio-option-text { font-size: 0.9rem; color: var(--text-primary, #fff); }
    .radio-option-desc { font-size: 0.78rem; color: var(--text-muted, rgba(255,255,255,0.4)); margin-top: 2px; }

    /* ── Color picker ────────────────────────────────── */
    .color-picker-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .color-swatch {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .color-swatch.selected,
    .color-swatch:hover {
      transform: scale(1.15);
      border-color: #fff;
    }

    .color-custom-input {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px dashed var(--glass-border, rgba(255,255,255,0.3));
      cursor: pointer;
      padding: 0;
      background: transparent;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
}

// ─── createInputField ─────────────────────────────────────────────────────────

/**
 * Create a labelled input field.
 * @param {object} options
 * @param {string} [options.type='text']   - Input type
 * @param {string} [options.placeholder]   - Placeholder text
 * @param {string} [options.label]         - Label text
 * @param {string} [options.icon]          - Left icon emoji
 * @param {string} [options.error]         - Error message
 * @param {string} [options.success]       - Success message
 * @param {string} [options.hint]          - Hint text below input
 * @param {boolean}[options.required]      - Show required mark
 * @param {string} [options.value]         - Initial value
 * @param {string} [options.id]            - ID for input (auto-generated if not set)
 * @param {string} [options.name]          - Input name
 * @param {string} [options.className]     - Extra classes on wrapper
 * @param {Function}[options.onInput]      - oninput handler
 * @param {Function}[options.onChange]     - onchange handler
 * @returns {HTMLDivElement}
 */
export function createInputField(options = {}) {
  injectInputStyles();

  const {
    type        = 'text',
    placeholder = '',
    label       = '',
    icon        = null,
    error       = null,
    success     = null,
    hint        = null,
    required    = false,
    value       = '',
    id          = `field-${Math.random().toString(36).slice(2, 7)}`,
    name        = id,
    className   = '',
    onInput     = null,
    onChange    = null,
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = `field-wrapper ${className}`.trim();

  if (label) {
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'field-label';
    lbl.textContent = label;
    if (required) {
      const star = document.createElement('span');
      star.className = 'field-required';
      star.textContent = ' *';
      star.setAttribute('aria-hidden', 'true');
      lbl.appendChild(star);
    }
    wrapper.appendChild(lbl);
  }

  const inputWrap = document.createElement('div');
  inputWrap.className = 'input-wrapper';

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'input-field-icon';
    iconEl.textContent = icon;
    iconEl.setAttribute('aria-hidden', 'true');
    inputWrap.appendChild(iconEl);
  }

  const input = document.createElement('input');
  input.id          = id;
  input.name        = name;
  input.type        = type;
  input.placeholder = placeholder;
  input.value       = value;
  input.className   = `field-input ${icon ? 'has-icon' : ''} ${error ? 'has-error' : ''} ${success ? 'has-success' : ''}`.trim();
  if (required) input.required = true;
  if (onInput)  input.addEventListener('input', onInput);
  if (onChange) input.addEventListener('change', onChange);

  inputWrap.appendChild(input);
  wrapper.appendChild(inputWrap);

  if (error) {
    const msg = document.createElement('span');
    msg.className = 'field-error-msg';
    msg.textContent = `⚠ ${error}`;
    wrapper.appendChild(msg);
  } else if (success) {
    const msg = document.createElement('span');
    msg.className = 'field-success-msg';
    msg.textContent = `✓ ${success}`;
    wrapper.appendChild(msg);
  } else if (hint) {
    const msg = document.createElement('span');
    msg.className = 'field-hint';
    msg.textContent = hint;
    wrapper.appendChild(msg);
  }

  /** Expose input element and helper methods */
  wrapper.input      = input;
  wrapper.getValue   = () => input.value;
  wrapper.setValue   = (v) => { input.value = v; };
  wrapper.setError   = (msg) => {
    input.classList.add('has-error');
    input.classList.remove('has-success');
    let el = wrapper.querySelector('.field-error-msg');
    if (!el) { el = document.createElement('span'); el.className = 'field-error-msg'; wrapper.appendChild(el); }
    el.textContent = `⚠ ${msg}`;
  };
  wrapper.clearError = () => {
    input.classList.remove('has-error');
    wrapper.querySelector('.field-error-msg')?.remove();
  };

  return wrapper;
}

// ─── createSearchBar ──────────────────────────────────────────────────────────

/**
 * Create a search bar with debounce.
 * @param {string}   placeholder
 * @param {Function} onSearch       - Called with the query string after debounce
 * @param {number}   [debounceMs=300]
 * @returns {HTMLDivElement}
 */
export function createSearchBar(placeholder = 'Search…', onSearch = null, debounceMs = 300) {
  injectInputStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'search-bar-wrapper';

  const icon = document.createElement('span');
  icon.className = 'search-bar-icon';
  icon.textContent = '🔍';
  icon.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.type        = 'search';
  input.placeholder = placeholder;
  input.className   = 'search-bar-input';
  input.setAttribute('aria-label', placeholder);
  input.autocomplete = 'off';

  const clearBtn = document.createElement('button');
  clearBtn.type      = 'button';
  clearBtn.className = 'search-bar-clear';
  clearBtn.textContent = '✕';
  clearBtn.setAttribute('aria-label', 'Clear search');

  const debouncedSearch = debounce((q) => { if (onSearch) onSearch(q); }, debounceMs);

  input.addEventListener('input', () => {
    const q = input.value;
    clearBtn.classList.toggle('visible', q.length > 0);
    debouncedSearch(q);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    if (onSearch) onSearch('');
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { clearBtn.click(); }
  });

  wrapper.appendChild(icon);
  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);

  wrapper.input    = input;
  wrapper.getValue = () => input.value;
  wrapper.clear    = () => clearBtn.click();

  return wrapper;
}

// ─── createTextarea ───────────────────────────────────────────────────────────

/**
 * Create a textarea with optional char counter.
 * @param {object} options
 * @param {string}  [options.label]
 * @param {string}  [options.placeholder]
 * @param {number}  [options.maxLength]
 * @param {number}  [options.rows=4]
 * @param {string}  [options.value='']
 * @param {string}  [options.id]
 * @param {boolean} [options.required]
 * @param {Function}[options.onInput]
 * @returns {HTMLDivElement}
 */
export function createTextarea(options = {}) {
  injectInputStyles();

  const {
    label       = '',
    placeholder = '',
    maxLength   = null,
    rows        = 4,
    value       = '',
    id          = `textarea-${Math.random().toString(36).slice(2, 7)}`,
    required    = false,
    className   = '',
    onInput     = null,
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = `field-wrapper ${className}`.trim();

  if (label) {
    const lbl = document.createElement('label');
    lbl.htmlFor   = id;
    lbl.className = 'field-label';
    lbl.textContent = label;
    if (required) {
      const star = document.createElement('span');
      star.className = 'field-required';
      star.textContent = ' *';
      star.setAttribute('aria-hidden', 'true');
      lbl.appendChild(star);
    }
    wrapper.appendChild(lbl);
  }

  const ta = document.createElement('textarea');
  ta.id          = id;
  ta.placeholder = placeholder;
  ta.rows        = rows;
  ta.className   = 'field-textarea';
  ta.value       = value;
  if (maxLength) ta.maxLength = maxLength;
  if (required)  ta.required  = true;

  let counter = null;

  if (maxLength) {
    counter = document.createElement('div');
    counter.className = 'field-char-counter';
    counter.textContent = `0 / ${maxLength}`;

    ta.addEventListener('input', () => {
      const len = ta.value.length;
      counter.textContent = `${len} / ${maxLength}`;
      counter.classList.toggle('warn', len >= maxLength * 0.8);
      counter.classList.toggle('over', len >= maxLength);
      if (onInput) onInput(ta.value);
    });
  } else if (onInput) {
    ta.addEventListener('input', () => onInput(ta.value));
  }

  wrapper.appendChild(ta);
  if (counter) wrapper.appendChild(counter);

  wrapper.textarea  = ta;
  wrapper.getValue  = () => ta.value;
  wrapper.setValue  = (v) => {
    ta.value = v;
    if (counter) counter.textContent = `${v.length} / ${maxLength}`;
  };

  return wrapper;
}

// ─── createTagInput ───────────────────────────────────────────────────────────

/**
 * Tag input that lets users add/remove chips.
 * @param {string[]} initialTags
 * @param {Function} onChange    - Called with updated tags array
 * @param {number}   maxTags     - Maximum number of tags allowed
 * @returns {HTMLDivElement}
 */
export function createTagInput(initialTags = [], onChange = null, maxTags = 10) {
  injectInputStyles();

  let tags = [...initialTags];

  const wrapper = document.createElement('div');
  wrapper.className = 'tag-input-wrapper';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Tags');

  const textInput = document.createElement('input');
  textInput.type        = 'text';
  textInput.className   = 'tag-text-input';
  textInput.placeholder = tags.length >= maxTags ? 'Max tags reached' : 'Add tag…';
  textInput.setAttribute('aria-label', 'Add tag');

  const renderChips = () => {
    wrapper.querySelectorAll('.tag-chip').forEach(c => c.remove());
    tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';

      const text = document.createElement('span');
      text.textContent = tag;

      const removeBtn = document.createElement('button');
      removeBtn.type      = 'button';
      removeBtn.className = 'tag-chip-remove';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', `Remove tag ${tag}`);
      removeBtn.addEventListener('click', () => {
        tags = tags.filter(t => t !== tag);
        renderChips();
        if (onChange) onChange([...tags]);
        textInput.placeholder = tags.length >= maxTags ? 'Max tags reached' : 'Add tag…';
      });

      chip.appendChild(text);
      chip.appendChild(removeBtn);
      wrapper.insertBefore(chip, textInput);
    });
    textInput.disabled = tags.length >= maxTags;
    textInput.placeholder = tags.length >= maxTags ? 'Max tags reached' : 'Add tag…';
  };

  const addTag = () => {
    const val = textInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (val && !tags.includes(val) && tags.length < maxTags) {
      tags.push(val);
      renderChips();
      if (onChange) onChange([...tags]);
    }
    textInput.value = '';
  };

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && textInput.value === '' && tags.length > 0) {
      tags.pop();
      renderChips();
      if (onChange) onChange([...tags]);
    }
  });

  textInput.addEventListener('blur', addTag);
  wrapper.addEventListener('click', () => textInput.focus());

  renderChips();
  wrapper.appendChild(textInput);

  wrapper.getTags  = () => [...tags];
  wrapper.setTags  = (newTags) => { tags = [...newTags]; renderChips(); };
  wrapper.addTag   = (tag) => { if (!tags.includes(tag) && tags.length < maxTags) { tags.push(tag); renderChips(); } };

  return wrapper;
}

// ─── createFileInput ──────────────────────────────────────────────────────────

/**
 * File input with drag-and-drop zone and image preview.
 * @param {object} options
 * @param {string}   [options.accept]     - Accept attribute (e.g. 'image/*')
 * @param {string}   [options.label]      - Zone headline text
 * @param {boolean}  [options.multiple]   - Allow multiple files
 * @param {boolean}  [options.preview]    - Show image preview
 * @param {Function} [options.onChange]   - Called with FileList
 * @param {number}   [options.maxSizeMB]  - Max file size in MB
 * @returns {HTMLDivElement}
 */
export function createFileInput(options = {}) {
  injectInputStyles();

  const {
    accept     = 'image/*,video/*',
    label      = 'Drop file here or click to upload',
    multiple   = false,
    preview    = true,
    onChange   = null,
    maxSizeMB  = 50,
  } = options;

  const zone = document.createElement('div');
  zone.className = 'file-drop-zone';

  const fileInput = document.createElement('input');
  fileInput.type     = 'file';
  fileInput.accept   = accept;
  fileInput.multiple = multiple;
  fileInput.setAttribute('aria-label', label);

  const iconEl = document.createElement('div');
  iconEl.className   = 'file-drop-zone-icon';
  iconEl.textContent = '📂';

  const textEl = document.createElement('div');
  textEl.className   = 'file-drop-zone-text';
  textEl.innerHTML   = `<strong>Click to upload</strong> or drag & drop<br><small>${label}</small>`;

  zone.appendChild(fileInput);
  zone.appendChild(iconEl);
  zone.appendChild(textEl);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    // Preview
    if (preview) {
      zone.querySelectorAll('.file-preview-img, .file-preview-name').forEach(el => el.remove());
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className = 'file-preview-img';
        img.alt = file.name;
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);
        zone.appendChild(img);
      }
      const nameEl = document.createElement('div');
      nameEl.className   = 'file-preview-name';
      nameEl.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      zone.appendChild(nameEl);
    }
    if (onChange) onChange(files);
  };

  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  zone.fileInput  = fileInput;
  zone.getFiles   = () => fileInput.files;
  zone.clear      = () => {
    fileInput.value = '';
    zone.querySelectorAll('.file-preview-img, .file-preview-name').forEach(el => el.remove());
  };

  return zone;
}

// ─── createSelect ─────────────────────────────────────────────────────────────

/**
 * Create a styled select dropdown.
 * @param {Array<{value:string, label:string}>} options
 * @param {string}   selected  - Currently selected value
 * @param {Function} onChange  - Called with new value
 * @param {string}   [label]   - Label text
 * @returns {HTMLDivElement}
 */
export function createSelect(options = [], selected = '', onChange = null, label = '') {
  injectInputStyles();

  const id = `select-${Math.random().toString(36).slice(2, 7)}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'field-wrapper';

  if (label) {
    const lbl = document.createElement('label');
    lbl.htmlFor   = id;
    lbl.className = 'field-label';
    lbl.textContent = label;
    wrapper.appendChild(lbl);
  }

  const select = document.createElement('select');
  select.id        = id;
  select.className = 'styled-select';

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value    = opt.value;
    option.textContent = opt.label;
    if (opt.value === selected) option.selected = true;
    select.appendChild(option);
  });

  if (onChange) select.addEventListener('change', () => onChange(select.value));
  wrapper.appendChild(select);

  wrapper.select   = select;
  wrapper.getValue = () => select.value;
  wrapper.setValue = (v) => { select.value = v; };

  return wrapper;
}

// ─── createToggle ─────────────────────────────────────────────────────────────

/**
 * iOS-style toggle switch.
 * @param {string}   label    - Label text
 * @param {boolean}  isOn     - Initial state
 * @param {Function} onChange - Called with new boolean state
 * @param {string}   [id]
 * @returns {HTMLLabelElement}
 */
export function createToggle(label, isOn = false, onChange = null, id = null) {
  injectInputStyles();

  const inputId = id || `toggle-${Math.random().toString(36).slice(2, 7)}`;

  const wrapper = document.createElement('label');
  wrapper.className  = 'toggle-switch-wrapper';
  wrapper.htmlFor    = inputId;

  const labelEl = document.createElement('span');
  labelEl.className   = 'toggle-switch-label';
  labelEl.textContent = label;

  const switchEl = document.createElement('span');
  switchEl.className = 'toggle-switch';

  const input = document.createElement('input');
  input.type    = 'checkbox';
  input.id      = inputId;
  input.checked = isOn;
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-checked', String(isOn));

  if (onChange) {
    input.addEventListener('change', () => {
      input.setAttribute('aria-checked', String(input.checked));
      onChange(input.checked);
    });
  }

  const track = document.createElement('span');
  track.className = 'toggle-track';

  switchEl.appendChild(input);
  switchEl.appendChild(track);
  wrapper.appendChild(labelEl);
  wrapper.appendChild(switchEl);

  wrapper.isOn    = () => input.checked;
  wrapper.setOn   = (v) => { input.checked = v; input.setAttribute('aria-checked', String(v)); };

  return wrapper;
}

// ─── createRadioGroup ─────────────────────────────────────────────────────────

/**
 * Radio button group.
 * @param {Array<{value:string, label:string, description?:string}>} options
 * @param {string}   selected - Currently selected value
 * @param {Function} onChange - Called with new value
 * @returns {HTMLDivElement}
 */
export function createRadioGroup(options = [], selected = '', onChange = null) {
  injectInputStyles();

  const group = document.createElement('div');
  group.className = 'radio-group';
  group.setAttribute('role', 'radiogroup');

  let currentSelected = selected;

  const updateSelection = (newValue) => {
    currentSelected = newValue;
    group.querySelectorAll('.radio-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === newValue);
      opt.setAttribute('aria-checked', String(opt.dataset.value === newValue));
    });
    if (onChange) onChange(newValue);
  };

  options.forEach(opt => {
    const option = document.createElement('div');
    option.className = `radio-option ${opt.value === selected ? 'selected' : ''}`;
    option.dataset.value = opt.value;
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(opt.value === selected));
    option.tabIndex = 0;

    const dot = document.createElement('div');
    dot.className = 'radio-dot';

    const textWrap = document.createElement('div');
    const textEl = document.createElement('div');
    textEl.className   = 'radio-option-text';
    textEl.textContent = opt.label;
    textWrap.appendChild(textEl);

    if (opt.description) {
      const desc = document.createElement('div');
      desc.className   = 'radio-option-desc';
      desc.textContent = opt.description;
      textWrap.appendChild(desc);
    }

    option.appendChild(dot);
    option.appendChild(textWrap);
    group.appendChild(option);

    option.addEventListener('click',   () => updateSelection(opt.value));
    option.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateSelection(opt.value); }
    });
  });

  group.getValue = () => currentSelected;
  group.setValue = updateSelection;

  return group;
}

// ─── createColorPicker ────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6',
  '#f97316', '#84cc16', '#ffffff', '#64748b',
];

/**
 * Simple color picker with swatches + custom color input.
 * @param {string}   value    - Currently selected color
 * @param {Function} onChange - Called with new hex color
 * @returns {HTMLDivElement}
 */
export function createColorPicker(value = '#7c3aed', onChange = null) {
  injectInputStyles();

  let currentColor = value;

  const wrapper = document.createElement('div');
  wrapper.className = 'color-picker-wrapper';

  const updateSelected = (color) => {
    currentColor = color;
    wrapper.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
    if (onChange) onChange(color);
  };

  PRESET_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type            = 'button';
    swatch.className       = `color-swatch ${color === value ? 'selected' : ''}`;
    swatch.dataset.color   = color;
    swatch.style.background = color;
    swatch.setAttribute('aria-label', color);
    swatch.setAttribute('title', color);
    swatch.addEventListener('click', () => updateSelected(color));
    wrapper.appendChild(swatch);
  });

  // Custom color input
  const customInput = document.createElement('input');
  customInput.type      = 'color';
  customInput.className = 'color-custom-input';
  customInput.value     = value;
  customInput.title     = 'Custom color';
  customInput.setAttribute('aria-label', 'Custom color');
  customInput.addEventListener('input', () => {
    customInput.dataset.color = customInput.value;
    updateSelected(customInput.value);
  });
  wrapper.appendChild(customInput);

  wrapper.getColor = () => currentColor;
  wrapper.setColor = (c) => { currentColor = c; customInput.value = c; updateSelected(c); };

  return wrapper;
}
