import { store } from '../../core/store.js';
import { showToast, showModal, closeModal } from '../../utils/dom.js';
import { formatRelativeTime } from '../../utils/formatters.js';

function injectStoryStyles() {
  if (document.getElementById('story-styles')) return;
  const s = document.createElement('style');
  s.id = 'story-styles';
  s.textContent = `
    .stories-row { display:flex; gap:14px; overflow-x:auto; padding:4px 2px 8px; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
    .stories-row::-webkit-scrollbar { display:none; }
    .story-item { display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; flex-shrink:0; scroll-snap-align:start; }
    .story-avatar-ring { width:66px; height:66px; border-radius:50%; padding:3px; background:var(--gradient-primary,linear-gradient(135deg,#7c3aed,#3b82f6)); flex-shrink:0; }
    .story-avatar-ring.viewed { background:rgba(255,255,255,0.15); }
    .story-avatar-inner { width:100%; height:100%; border-radius:50%; background:var(--bg-primary,#0f0f23); padding:2px; }
    .story-avatar-img { width:100%; height:100%; border-radius:50%; object-fit:cover; display:block; }
    .story-username { font-size:0.72rem; color:var(--text-secondary,rgba(255,255,255,0.7)); white-space:nowrap; max-width:70px; overflow:hidden; text-overflow:ellipsis; text-align:center; }
    .add-story-ring { width:66px; height:66px; border-radius:50%; border:2px dashed var(--primary,#7c3aed); display:flex; align-items:center; justify-content:center; font-size:1.6rem; color:var(--primary,#7c3aed); background:var(--primary-alpha,rgba(124,58,237,0.08)); flex-shrink:0; transition:background 0.2s; }
    .add-story-ring:hover { background:var(--primary-alpha,rgba(124,58,237,0.16)); }

    /* Viewer */
    .story-viewer-overlay { position:fixed; inset:0; background:#000; z-index:var(--z-modal,300); display:flex; flex-direction:column; }
    .story-viewer-progress { display:flex; gap:4px; padding:14px 14px 0; }
    .story-progress-bar { flex:1; height:3px; background:rgba(255,255,255,0.3); border-radius:100px; overflow:hidden; }
    .story-progress-fill { height:100%; background:#fff; width:0%; transition:width linear; border-radius:100px; }
    .story-progress-fill.done { width:100%; transition:none; }
    .story-viewer-header { display:flex; align-items:center; gap:10px; padding:12px 14px; }
    .story-viewer-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid #fff; }
    .story-viewer-username { font-weight:600; color:#fff; font-size:0.9rem; flex:1; }
    .story-viewer-time { font-size:0.78rem; color:rgba(255,255,255,0.6); }
    .story-viewer-close { background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; padding:4px; }
    .story-viewer-media { flex:1; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
    .story-viewer-img { max-width:100%; max-height:100%; object-fit:contain; }
    .story-viewer-bg { position:absolute; inset:0; background-size:cover; background-position:center; filter:blur(20px) brightness(0.4); }
    .story-viewer-text-overlay { position:absolute; bottom:80px; left:0; right:0; padding:20px; text-align:center; }
    .story-viewer-caption { color:#fff; font-size:1.1rem; font-weight:600; text-shadow:0 2px 8px rgba(0,0,0,0.6); }
    .story-viewer-tap-left  { position:absolute; left:0; top:0; width:40%; height:100%; z-index:2; cursor:pointer; }
    .story-viewer-tap-right { position:absolute; right:0; top:0; width:40%; height:100%; z-index:2; cursor:pointer; }
    .story-viewer-actions { display:flex; align-items:center; gap:12px; padding:14px 16px 20px; }
    .story-reply-input { flex:1; padding:10px 16px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:100px; color:#fff; font-family:inherit; font-size:0.9rem; outline:none; }
    .story-reply-input::placeholder { color:rgba(255,255,255,0.4); }
    .story-heart-btn { background:none; border:none; color:#fff; font-size:1.6rem; cursor:pointer; transition:transform 0.2s; }
    .story-heart-btn:active { transform:scale(1.3); }
    @keyframes story-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.6)} 50%{box-shadow:0 0 0 12px rgba(124,58,237,0)} }
    .story-avatar-ring:not(.viewed) { animation:story-pulse 2s infinite; }

    /* Add story modal */
    .add-story-modal { display:flex; flex-direction:column; gap:16px; min-width:320px; max-width:480px; }
    .story-color-bg-preview { width:100%; height:200px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:700; color:#fff; text-align:center; padding:20px; word-break:break-word; transition:background 0.3s; }
    .story-color-swatches { display:flex; gap:8px; flex-wrap:wrap; }
    .story-color-swatch { width:28px; height:28px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:transform 0.2s; }
    .story-color-swatch:hover,.story-color-swatch.selected { transform:scale(1.2); border-color:#fff; }
  `;
  document.head.appendChild(s);
}

const STORY_COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#000000','#1e293b'];

export function renderStoriesRow(stories = [], currentUser = null) {
  injectStoryStyles();
  const grouped = {};
  stories.forEach(s => {
    if (!grouped[s.authorId]) grouped[s.authorId] = { author: s, items: [] };
    grouped[s.authorId].items.push(s);
  });
  const groups = Object.values(grouped);

  return `
    <div class="stories-row" id="stories-row" role="list" aria-label="Stories">
      ${currentUser ? `
        <div class="story-item" id="add-story-btn" role="listitem" aria-label="Add your story" tabindex="0">
          <div class="add-story-ring" aria-hidden="true">＋</div>
          <span class="story-username">Your story</span>
        </div>
      ` : ''}
      ${groups.map((g, idx) => {
        const allViewed = g.items.every(s => s.viewedBy?.includes(currentUser?.uid));
        const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(g.author.authorName || 'U')}&background=7c3aed&color=fff`;
        return `
          <div class="story-item" role="listitem" tabindex="0"
               data-story-group="${idx}" aria-label="${g.author.authorName}'s story">
            <div class="story-avatar-ring ${allViewed ? 'viewed' : ''}">
              <div class="story-avatar-inner">
                <img src="${g.author.authorAvatar || avatarFallback}"
                     alt="${g.author.authorName}"
                     class="story-avatar-img"
                     onerror="this.src='${avatarFallback}'">
              </div>
            </div>
            <span class="story-username">${g.author.authorName || 'User'}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function initStoriesRow(container, stories = [], currentUser = null) {
  if (!container) return;

  const grouped = {};
  stories.forEach(s => {
    if (!grouped[s.authorId]) grouped[s.authorId] = { author: s, items: [] };
    grouped[s.authorId].items.push(s);
  });
  const groups = Object.values(grouped);

  container.addEventListener('click', (e) => {
    const item = e.target.closest('.story-item');
    if (!item) return;

    if (item.id === 'add-story-btn') {
      openAddStoryModal(currentUser);
      return;
    }

    const idx = parseInt(item.dataset.storyGroup);
    if (!isNaN(idx) && groups[idx]) {
      openStoryViewer(groups, idx, currentUser);
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.target.click();
    }
  });
}

function openStoryViewer(groups, startGroupIdx, currentUser) {
  injectStoryStyles();
  let groupIdx = startGroupIdx;
  let storyIdx = 0;
  let timer = null;
  let progressTimer = null;

  const overlay = document.createElement('div');
  overlay.className = 'story-viewer-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Story viewer');
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const render = () => {
    clearTimeout(timer);
    clearInterval(progressTimer);
    const group   = groups[groupIdx];
    const story   = group.items[storyIdx];
    const total   = group.items.length;
    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.author.authorName || 'U')}&background=7c3aed&color=fff`;

    overlay.innerHTML = `
      <div class="story-viewer-progress">
        ${group.items.map((_, i) => `
          <div class="story-progress-bar">
            <div class="story-progress-fill ${i < storyIdx ? 'done' : ''}" id="spf-${i}"></div>
          </div>
        `).join('')}
      </div>
      <div class="story-viewer-header">
        <img src="${group.author.authorAvatar || avatarFallback}" class="story-viewer-avatar" alt="${group.author.authorName}">
        <span class="story-viewer-username">${group.author.authorName || 'User'}</span>
        <span class="story-viewer-time">${formatRelativeTime(story.createdAt)}</span>
        <button class="story-viewer-close" id="story-close-btn" aria-label="Close story">✕</button>
      </div>
      <div class="story-viewer-media">
        ${story.mediaURL
          ? `<div class="story-viewer-bg" style="background-image:url('${story.mediaURL}')"></div>
             <img src="${story.mediaURL}" class="story-viewer-img" alt="Story">`
          : `<div style="position:absolute;inset:0;background:${story.bgColor || '#7c3aed'};display:flex;align-items:center;justify-content:center;padding:40px;">
               <p style="color:#fff;font-size:1.4rem;font-weight:700;text-align:center;">${story.text || ''}</p>
             </div>`
        }
        ${story.text && story.mediaURL ? `<div class="story-viewer-text-overlay"><p class="story-viewer-caption">${story.text}</p></div>` : ''}
        <div class="story-viewer-tap-left"  id="story-tap-left"></div>
        <div class="story-viewer-tap-right" id="story-tap-right"></div>
      </div>
      <div class="story-viewer-actions">
        <input type="text" class="story-reply-input" placeholder="Send a message…" aria-label="Reply to story">
        <button class="story-heart-btn" aria-label="React with heart">🤍</button>
      </div>
    `;

    const fill = document.getElementById(`spf-${storyIdx}`);
    if (fill) {
      let pct = 0;
      fill.style.width = '0%';
      progressTimer = setInterval(() => {
        pct += 2;
        if (fill) fill.style.width = `${pct}%`;
        if (pct >= 100) clearInterval(progressTimer);
      }, 100);
    }

    timer = setTimeout(advance, 5000);

    document.getElementById('story-close-btn')?.addEventListener('click', closeViewer);
    document.getElementById('story-tap-left')?.addEventListener('click', goBack);
    document.getElementById('story-tap-right')?.addEventListener('click', advance);

    const heartBtn = overlay.querySelector('.story-heart-btn');
    heartBtn?.addEventListener('click', () => { heartBtn.textContent = '❤️'; showToast('Reacted!', 'success', 1500); });
  };

  const advance = () => {
    const group = groups[groupIdx];
    if (storyIdx < group.items.length - 1) {
      storyIdx++;
      render();
    } else if (groupIdx < groups.length - 1) {
      groupIdx++;
      storyIdx = 0;
      render();
    } else {
      closeViewer();
    }
  };

  const goBack = () => {
    if (storyIdx > 0) {
      storyIdx--;
      render();
    } else if (groupIdx > 0) {
      groupIdx--;
      storyIdx = groups[groupIdx].items.length - 1;
      render();
    }
  };

  const closeViewer = () => {
    clearTimeout(timer);
    clearInterval(progressTimer);
    overlay.remove();
    document.body.style.overflow = '';
  };

  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) diff > 0 ? advance() : goBack();
  });

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { closeViewer(); document.removeEventListener('keydown', handler); }
    if (e.key === 'ArrowRight') advance();
    if (e.key === 'ArrowLeft')  goBack();
  });

  render();
}

export function renderStoryViewer(stories, startIndex = 0) {
  // Kept for API compatibility – openStoryViewer is the full implementation
  const groups = [{ author: stories[0] || {}, items: stories }];
  openStoryViewer(groups, 0, store.getState().user);
  return '';
}

export function initStoryViewer() { /* handled internally */ }

function openAddStoryModal(user) {
  injectStoryStyles();
  let selectedColor = '#7c3aed';
  let storyText     = '';

  const overlay = showModal(`
    <div class="add-story-modal">
      <h2 style="font-size:1.1rem;font-weight:700;color:var(--text-primary,#fff);margin:0;">Add Story</h2>
      <div class="story-color-bg-preview" id="story-preview" style="background:${selectedColor};">
        Your story text appears here…
      </div>
      <div class="story-color-swatches" id="story-swatches">
        ${STORY_COLORS.map(c => `<div class="story-color-swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c};" title="${c}"></div>`).join('')}
      </div>
      <textarea id="story-text-input" placeholder="Add text to your story…" rows="3"
        style="width:100%;background:var(--glass-subtle,rgba(255,255,255,0.06));border:1px solid var(--glass-border,rgba(255,255,255,0.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#fff);font-family:inherit;font-size:0.9rem;resize:vertical;outline:none;"></textarea>
      <div id="story-file-area" style="border:2px dashed var(--glass-border,rgba(255,255,255,0.15));border-radius:12px;padding:20px;text-align:center;cursor:pointer;position:relative;">
        <input type="file" accept="image/*,video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;" id="story-file-input">
        <span style="color:var(--text-muted,rgba(255,255,255,0.4));font-size:0.88rem;">📷 Upload photo or video (optional)</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-ghost btn-sm" id="story-cancel-btn">Cancel</button>
        <button class="btn btn-primary btn-sm" id="story-post-btn">Share Story</button>
      </div>
    </div>
  `);

  overlay.querySelector('#story-cancel-btn')?.addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#story-swatches')?.addEventListener('click', (e) => {
    const swatch = e.target.closest('.story-color-swatch');
    if (!swatch) return;
    selectedColor = swatch.dataset.color;
    overlay.querySelectorAll('.story-color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === selectedColor));
    const preview = overlay.querySelector('#story-preview');
    if (preview) preview.style.background = selectedColor;
  });

  overlay.querySelector('#story-text-input')?.addEventListener('input', (e) => {
    storyText = e.target.value;
    const preview = overlay.querySelector('#story-preview');
    if (preview) preview.textContent = storyText || 'Your story text appears here…';
  });

  overlay.querySelector('#story-post-btn')?.addEventListener('click', async () => {
    try {
      const { addStory } = await import('../../services/story.service.js');
      const file = overlay.querySelector('#story-file-input')?.files?.[0];
      await addStory(user.uid, { text: storyText, bgColor: selectedColor, file });
      closeModal(overlay);
      showToast('Story shared!', 'success');
    } catch {
      showToast('Failed to share story', 'error');
    }
  });
}

export function renderAddStoryModal() { openAddStoryModal(store.getState().user); }
