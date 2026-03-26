// ─── CSS Injection ────────────────────────────────────────────────────────────

function injectBentoStyles() {
  if (document.getElementById('bento-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'bento-card-styles';
  style.textContent = `
    /* ── Bento card ──────────────────────────────────── */
    .bento-card {
      background: var(--glass-bg, rgba(15,15,35,0.7));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .bento-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }

    .bento-card-sm  { min-height: 120px; }
    .bento-card-md  { min-height: 160px; }
    .bento-card-lg  { min-height: 220px; }
    .bento-card-xl  { min-height: 300px; }

    /* ── Bento header ────────────────────────────────── */
    .bento-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .bento-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .bento-card-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted, rgba(255,255,255,0.45));
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .bento-card-value {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text-primary, #fff);
      line-height: 1.1;
    }

    .bento-card-subtitle {
      font-size: 0.82rem;
      color: var(--text-muted, rgba(255,255,255,0.4));
    }

    /* ── Trend badge ─────────────────────────────────── */
    .bento-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 100px;
    }

    .bento-trend.up   { background: rgba(16,185,129,0.15); color: #10b981; }
    .bento-trend.down { background: rgba(239,68,68,0.15);  color: #ef4444; }
    .bento-trend.neutral { background: rgba(255,255,255,0.07); color: var(--text-muted, rgba(255,255,255,0.4)); }

    /* ── Stat card ───────────────────────────────────── */
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 16px;
      backdrop-filter: blur(12px);
      transition: transform 0.2s ease;
    }

    .stat-card:hover { transform: translateY(-2px); }

    .stat-card-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .stat-card-info { flex: 1; min-width: 0; }
    .stat-card-value { font-size: 1.6rem; font-weight: 800; color: var(--text-primary, #fff); line-height: 1.1; }
    .stat-card-label { font-size: 0.8rem; color: var(--text-muted, rgba(255,255,255,0.45)); margin-top: 2px; }

    /* ── Chart card ──────────────────────────────────── */
    .chart-card {
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      padding: 20px;
      backdrop-filter: blur(12px);
    }

    .chart-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .chart-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }

    .chart-canvas-wrapper {
      position: relative;
      width: 100%;
    }

    .chart-canvas-wrapper canvas { display: block; width: 100% !important; }

    /* ── Activity card ───────────────────────────────── */
    .activity-card {
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      padding: 20px;
      backdrop-filter: blur(12px);
    }

    .activity-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
      margin-bottom: 14px;
    }

    .activity-list { display: flex; flex-direction: column; gap: 12px; }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .activity-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
      background: var(--glass-subtle, rgba(255,255,255,0.06));
    }

    .activity-item-text { flex: 1; min-width: 0; }
    .activity-item-label { font-size: 0.88rem; color: var(--text-primary, #fff); }
    .activity-item-time  { font-size: 0.75rem; color: var(--text-muted, rgba(255,255,255,0.4)); }

    /* ── Profile mini card ───────────────────────────── */
    .profile-mini-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 20px;
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      backdrop-filter: blur(12px);
      text-align: center;
    }

    .profile-mini-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--primary, #7c3aed);
    }

    .profile-mini-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }

    .profile-mini-username {
      font-size: 0.82rem;
      color: var(--text-muted, rgba(255,255,255,0.45));
    }

    .profile-mini-stats {
      display: flex;
      gap: 16px;
      margin-top: 4px;
    }

    .profile-mini-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .profile-mini-stat-value { font-size: 1rem; font-weight: 700; color: var(--text-primary, #fff); }
    .profile-mini-stat-label { font-size: 0.72rem; color: var(--text-muted, rgba(255,255,255,0.4)); }

    /* ── Trending card ───────────────────────────────── */
    .trending-card {
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      padding: 20px;
      backdrop-filter: blur(12px);
    }

    .trending-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
      margin-bottom: 14px;
    }

    .trending-list { display: flex; flex-direction: column; gap: 2px; }

    .trending-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .trending-item:hover { background: var(--glass-subtle, rgba(255,255,255,0.05)); }

    .trending-rank {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted, rgba(255,255,255,0.3));
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .trending-item-text { flex: 1; min-width: 0; }
    .trending-item-tag   { font-size: 0.9rem; font-weight: 600; color: var(--primary, #7c3aed); }
    .trending-item-count { font-size: 0.75rem; color: var(--text-muted, rgba(255,255,255,0.4)); }

    /* ── Decorative gradient blob ─────────────────────── */
    .bento-blob {
      position: absolute;
      border-radius: 50%;
      opacity: 0.12;
      pointer-events: none;
      filter: blur(40px);
    }
  `;
  document.head.appendChild(style);
}

// ─── Color utilities ──────────────────────────────────────────────────────────

const COLOR_MAP = {
  purple: { bg: 'rgba(124,58,237,0.15)',  fg: '#7c3aed' },
  blue:   { bg: 'rgba(59,130,246,0.15)',  fg: '#3b82f6' },
  green:  { bg: 'rgba(16,185,129,0.15)',  fg: '#10b981' },
  orange: { bg: 'rgba(245,158,11,0.15)',  fg: '#f59e0b' },
  red:    { bg: 'rgba(239,68,68,0.15)',   fg: '#ef4444' },
  pink:   { bg: 'rgba(236,72,153,0.15)',  fg: '#ec4899' },
  cyan:   { bg: 'rgba(6,182,212,0.15)',   fg: '#06b6d4' },
  gray:   { bg: 'rgba(100,116,139,0.15)', fg: '#64748b' },
};

function resolveColor(color = 'purple') {
  return COLOR_MAP[color] || { bg: 'rgba(124,58,237,0.15)', fg: color };
}

// ─── createBentoCard ─────────────────────────────────────────────────────────

/**
 * Create a bento-style info card.
 * @param {object} options
 * @param {string}  [options.title]    - Card title/label
 * @param {string}  [options.value]    - Large value display
 * @param {string}  [options.subtitle] - Subtitle/description
 * @param {string}  [options.icon]     - Emoji icon
 * @param {string}  [options.color]    - Color key from COLOR_MAP or hex
 * @param {string}  [options.size]     - 'sm' | 'md' | 'lg' | 'xl'
 * @param {object}  [options.trend]    - { direction:'up'|'down'|'neutral', value:'12%' }
 * @param {Array}   [options.chartData]- Sparkline data array
 * @returns {HTMLDivElement}
 */
export function createBentoCard(options = {}) {
  injectBentoStyles();

  const {
    title     = '',
    value     = '',
    subtitle  = '',
    icon      = '📊',
    color     = 'purple',
    size      = 'md',
    trend     = null,
    chartData = null,
  } = options;

  const c = resolveColor(color);

  const card = document.createElement('div');
  card.className = `bento-card bento-card-${size}`;

  // Decorative blob
  const blob = document.createElement('div');
  blob.className = 'bento-blob';
  blob.style.cssText = `width:100px;height:100px;background:${c.fg};top:-20px;right:-20px;`;
  card.appendChild(blob);

  // Header row
  const header = document.createElement('div');
  header.className = 'bento-card-header';

  const iconEl = document.createElement('div');
  iconEl.className   = 'bento-card-icon';
  iconEl.style.background = c.bg;
  iconEl.textContent = icon;

  const titleEl = document.createElement('div');
  titleEl.className   = 'bento-card-title';
  titleEl.textContent = title;

  header.appendChild(titleEl);
  header.appendChild(iconEl);
  card.appendChild(header);

  // Value
  const valueEl = document.createElement('div');
  valueEl.className   = 'bento-card-value';
  valueEl.textContent = value;
  card.appendChild(valueEl);

  // Trend
  if (trend) {
    const trendEl = document.createElement('span');
    trendEl.className = `bento-trend ${trend.direction || 'neutral'}`;
    const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
    trendEl.textContent = `${arrow} ${trend.value || ''}`;
    card.appendChild(trendEl);
  }

  // Subtitle
  if (subtitle) {
    const subEl = document.createElement('div');
    subEl.className   = 'bento-card-subtitle';
    subEl.textContent = subtitle;
    card.appendChild(subEl);
  }

  // Sparkline chart
  if (chartData && chartData.length > 0) {
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'chart-canvas-wrapper';
    canvasWrap.style.height = '50px';
    const canvas = document.createElement('canvas');
    canvas.height = 50;
    canvasWrap.appendChild(canvas);
    card.appendChild(canvasWrap);
    // Render after DOM insertion
    requestAnimationFrame(() => renderChart(canvas, chartData, [], 'line', c.fg));
  }

  return card;
}

// ─── createStatCard ───────────────────────────────────────────────────────────

/**
 * Create a horizontal stat display card.
 * @param {string} label
 * @param {string|number} value
 * @param {string} icon
 * @param {string} color
 * @param {object} [trend]
 * @returns {HTMLDivElement}
 */
export function createStatCard(label, value, icon = '📊', color = 'purple', trend = null) {
  injectBentoStyles();

  const c = resolveColor(color);

  const card = document.createElement('div');
  card.className = 'stat-card';

  const iconEl = document.createElement('div');
  iconEl.className   = 'stat-card-icon';
  iconEl.style.background = c.bg;
  iconEl.textContent = icon;

  const info = document.createElement('div');
  info.className = 'stat-card-info';

  const valEl = document.createElement('div');
  valEl.className   = 'stat-card-value';
  valEl.style.color = c.fg;
  valEl.textContent = value;

  const lblEl = document.createElement('div');
  lblEl.className   = 'stat-card-label';
  lblEl.textContent = label;

  info.appendChild(valEl);
  info.appendChild(lblEl);
  card.appendChild(iconEl);
  card.appendChild(info);

  if (trend) {
    const trendEl = document.createElement('span');
    trendEl.className = `bento-trend ${trend.direction || 'neutral'}`;
    const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
    trendEl.textContent = `${arrow} ${trend.value || ''}`;
    card.appendChild(trendEl);
  }

  return card;
}

// ─── createChartCard ──────────────────────────────────────────────────────────

/**
 * Create a card with a canvas-rendered chart.
 * @param {string}   title
 * @param {number[]} data
 * @param {string[]} labels
 * @param {string}   type   - 'line' | 'bar' | 'doughnut'
 * @param {string}   color
 * @returns {HTMLDivElement}
 */
export function createChartCard(title, data = [], labels = [], type = 'line', color = 'purple') {
  injectBentoStyles();

  const c = resolveColor(color);

  const card = document.createElement('div');
  card.className = 'chart-card';

  const header = document.createElement('div');
  header.className = 'chart-card-header';

  const titleEl = document.createElement('div');
  titleEl.className   = 'chart-card-title';
  titleEl.textContent = title;

  const typeBadge = document.createElement('span');
  typeBadge.style.cssText = `font-size:0.75rem;color:var(--text-muted,rgba(255,255,255,0.4));`;
  typeBadge.textContent = type;

  header.appendChild(titleEl);
  header.appendChild(typeBadge);
  card.appendChild(header);

  const wrap = document.createElement('div');
  wrap.className = 'chart-canvas-wrapper';
  wrap.style.height = type === 'doughnut' ? '200px' : '150px';

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  card.appendChild(wrap);

  requestAnimationFrame(() => renderChart(canvas, data, labels, type, c.fg));

  return card;
}

// ─── createActivityCard ───────────────────────────────────────────────────────

/**
 * Create a card showing a list of activity items.
 * @param {string} title
 * @param {Array<{icon:string, label:string, time:string, color?:string}>} items
 * @returns {HTMLDivElement}
 */
export function createActivityCard(title, items = []) {
  injectBentoStyles();

  const card = document.createElement('div');
  card.className = 'activity-card';

  const titleEl = document.createElement('div');
  titleEl.className   = 'activity-card-title';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  const list = document.createElement('div');
  list.className = 'activity-list';

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'activity-item';

    const iconEl = document.createElement('div');
    iconEl.className   = 'activity-item-icon';
    iconEl.textContent = item.icon || '•';
    if (item.color) {
      const c = resolveColor(item.color);
      iconEl.style.background = c.bg;
    }

    const textWrap = document.createElement('div');
    textWrap.className = 'activity-item-text';

    const labelEl = document.createElement('div');
    labelEl.className   = 'activity-item-label';
    labelEl.textContent = item.label;

    const timeEl = document.createElement('div');
    timeEl.className   = 'activity-item-time';
    timeEl.textContent = item.time || '';

    textWrap.appendChild(labelEl);
    textWrap.appendChild(timeEl);
    row.appendChild(iconEl);
    row.appendChild(textWrap);
    list.appendChild(row);
  });

  card.appendChild(list);
  return card;
}

// ─── createProfileMiniCard ────────────────────────────────────────────────────

/**
 * Create a mini profile preview card.
 * @param {object} user - { displayName, username, photoURL, followers, following, posts }
 * @returns {HTMLDivElement}
 */
export function createProfileMiniCard(user) {
  injectBentoStyles();

  const card = document.createElement('div');
  card.className = 'profile-mini-card';

  const avatarSrc = user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=7c3aed&color=fff`;

  const avatar = document.createElement('img');
  avatar.className = 'profile-mini-avatar';
  avatar.src = avatarSrc;
  avatar.alt = user?.displayName || 'User';
  avatar.onerror = () => { avatar.src = 'https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff'; };

  const nameEl = document.createElement('div');
  nameEl.className   = 'profile-mini-name';
  nameEl.textContent = user?.displayName || 'User';

  const usernameEl = document.createElement('div');
  usernameEl.className   = 'profile-mini-username';
  usernameEl.textContent = `@${user?.username || 'user'}`;

  const stats = document.createElement('div');
  stats.className = 'profile-mini-stats';

  const addStat = (value, label) => {
    const s = document.createElement('div');
    s.className = 'profile-mini-stat';
    const v = document.createElement('div');
    v.className   = 'profile-mini-stat-value';
    v.textContent = value != null ? value : '—';
    const l = document.createElement('div');
    l.className   = 'profile-mini-stat-label';
    l.textContent = label;
    s.appendChild(v);
    s.appendChild(l);
    return s;
  };

  stats.appendChild(addStat(user?.postsCount   ?? 0, 'Posts'));
  stats.appendChild(addStat(user?.followersCount ?? 0, 'Followers'));
  stats.appendChild(addStat(user?.followingCount ?? 0, 'Following'));

  card.appendChild(avatar);
  card.appendChild(nameEl);
  card.appendChild(usernameEl);
  card.appendChild(stats);

  return card;
}

// ─── renderChart ──────────────────────────────────────────────────────────────

/**
 * Render a chart on a canvas element using the pure Canvas 2D API.
 * Supports 'line', 'bar', and 'doughnut' chart types.
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} data
 * @param {string[]} labels
 * @param {'line'|'bar'|'doughnut'} type
 * @param {string} color - Hex or CSS color for the primary series
 */
export function renderChart(canvas, data, labels = [], type = 'line', color = '#7c3aed') {
  if (!canvas || !data || data.length === 0) return;

  const dpr    = window.devicePixelRatio || 1;
  const width  = canvas.parentElement?.clientWidth  || 300;
  const height = canvas.parentElement?.clientHeight || 150;

  canvas.width  = width  * dpr;
  canvas.height = height * dpr;
  canvas.style.width  = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padTop    = 10;
  const padBottom = labels.length > 0 ? 28 : 10;
  const padLeft   = 10;
  const padRight  = 10;

  const drawW = width  - padLeft - padRight;
  const drawH = height - padTop  - padBottom;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range  = maxVal - minVal || 1;

  const toX = (i) => padLeft + (i / (data.length - 1 || 1)) * drawW;
  const toY = (v) => padTop  + drawH - ((v - minVal) / range) * drawH;

  ctx.clearRect(0, 0, width, height);

  if (type === 'line') {
    // Gradient fill
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + drawH);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    // Fill path
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((v, i) => {
      if (i === 0) return;
      const x0 = toX(i - 1), y0 = toY(data[i - 1]);
      const x1 = toX(i),     y1 = toY(v);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    });
    ctx.lineTo(toX(data.length - 1), padTop + drawH);
    ctx.lineTo(toX(0), padTop + drawH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((v, i) => {
      if (i === 0) return;
      const x0 = toX(i - 1), y0 = toY(data[i - 1]);
      const x1 = toX(i),     y1 = toY(v);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // Dots
    data.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

  } else if (type === 'bar') {
    const barCount = data.length;
    const gap      = Math.max(2, drawW * 0.05);
    const barW     = (drawW - gap * (barCount + 1)) / barCount;

    data.forEach((v, i) => {
      const barH = ((v - minVal) / range) * drawH;
      const x    = padLeft + gap + i * (barW + gap);
      const y    = padTop  + drawH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '88');

      ctx.beginPath();
      const r = Math.min(4, barW / 2);
      ctx.roundRect?.(x, y, barW, barH, [r, r, 0, 0]) || ctx.rect(x, y, barW, barH);
      ctx.fillStyle = grad;
      ctx.fill();
    });

  } else if (type === 'doughnut') {
    const cx     = width  / 2;
    const cy     = height / 2;
    const radius = Math.min(cx, cy) - 20;
    const inner  = radius * 0.55;
    const total  = data.reduce((s, v) => s + v, 0) || 1;

    const PALETTE = [color, '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    let startAngle = -Math.PI / 2;

    data.forEach((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      startAngle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15,15,35,0.9)';
    ctx.fill();

    // Center text (first value as %)
    if (data.length > 0) {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#fff';
      ctx.font         = `bold ${Math.floor(inner * 0.4)}px sans-serif`;
      ctx.fillText(`${Math.round((data[0] / total) * 100)}%`, cx, cy);
    }
  }

  // Labels
  if (labels.length > 0 && type !== 'doughnut') {
    ctx.fillStyle    = 'rgba(255,255,255,0.35)';
    ctx.font         = '10px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const step = Math.ceil(labels.length / Math.floor(drawW / 50));
    labels.forEach((lbl, i) => {
      if (i % step !== 0) return;
      ctx.fillText(lbl, toX(i), height - padBottom + 4);
    });
  }
}

// ─── createTrendingCard ───────────────────────────────────────────────────────

/**
 * Create a trending topics/hashtags card.
 * @param {Array<{tag:string, count:number|string, href?:string}>} items
 * @param {string} title
 * @returns {HTMLDivElement}
 */
export function createTrendingCard(items = [], title = 'Trending') {
  injectBentoStyles();

  const card = document.createElement('div');
  card.className = 'trending-card';

  const titleEl = document.createElement('div');
  titleEl.className   = 'trending-card-title';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  const list = document.createElement('div');
  list.className = 'trending-list';

  items.slice(0, 10).forEach((item, index) => {
    const row = document.createElement('a');
    row.className   = 'trending-item';
    row.href        = item.href || `/explore?tag=${encodeURIComponent(item.tag)}`;
    if (!item.href) row.dataset.link = '';
    row.setAttribute('aria-label', `#${item.tag} – ${item.count} posts`);

    const rank = document.createElement('span');
    rank.className   = 'trending-rank';
    rank.textContent = index + 1;

    const textWrap = document.createElement('div');
    textWrap.className = 'trending-item-text';

    const tagEl = document.createElement('div');
    tagEl.className   = 'trending-item-tag';
    tagEl.textContent = `#${item.tag}`;

    const countEl = document.createElement('div');
    countEl.className   = 'trending-item-count';
    countEl.textContent = item.count != null ? `${item.count} posts` : '';

    textWrap.appendChild(tagEl);
    textWrap.appendChild(countEl);
    row.appendChild(rank);
    row.appendChild(textWrap);
    list.appendChild(row);
  });

  card.appendChild(list);
  return card;
}
