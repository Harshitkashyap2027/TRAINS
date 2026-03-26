import { likePost, bookmarkPost, sharePost } from '../../services/post.service.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { formatRelativeTime, linkifyText, formatNumber } from '../../utils/formatters.js';
import { showToast } from '../../utils/dom.js';

function injectPostStyles() {
  if (document.getElementById('post-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'post-widget-styles';
  style.textContent = `
    .post-card {
      background: var(--glass-bg, rgba(15,15,35,0.7));
      border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
      border-radius: 20px;
      padding: 20px;
      backdrop-filter: blur(16px);
      transition: border-color 0.2s ease;
    }
    .post-card:hover { border-color: rgba(255,255,255,0.14); }
    .post-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
    .post-author-link { display:flex; align-items:center; gap:10px; text-decoration:none; flex:1; min-width:0; }
    .post-author-info { min-width:0; }
    .post-author-name { font-weight:700; font-size:0.9rem; color:var(--text-primary,#fff); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .post-author-meta { display:flex; align-items:center; gap:4px; font-size:0.78rem; color:var(--text-muted,rgba(255,255,255,0.4)); }
    .post-options-btn { color:var(--text-muted,rgba(255,255,255,0.4)); font-size:1.2rem; flex-shrink:0; }
    .post-content { font-size:0.95rem; line-height:1.65; color:var(--text-primary,#fff); white-space:pre-wrap; word-break:break-word; margin-bottom:12px; }
    .post-media { margin:12px 0; border-radius:14px; overflow:hidden; }
    .post-image { width:100%; max-height:500px; object-fit:cover; cursor:pointer; display:block; border-radius:14px; }
    .post-video { width:100%; border-radius:14px; max-height:500px; background:#000; display:block; }
    .post-hashtags { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
    .hashtag { color:var(--primary,#7c3aed); font-size:0.88rem; text-decoration:none; font-weight:500; }
    .hashtag:hover { text-decoration:underline; }
    .mention { color:var(--accent,#3b82f6); text-decoration:none; }
    .mention:hover { text-decoration:underline; }
    .post-actions { display:flex; align-items:center; gap:4px; padding-top:14px; border-top:1px solid var(--glass-border,rgba(255,255,255,0.06)); margin-top:14px; }
    .post-action-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:100px; border:none; background:transparent; color:var(--text-muted,rgba(255,255,255,0.5)); cursor:pointer; font-size:0.85rem; font-weight:500; transition:all 0.2s ease; }
    .post-action-btn:hover { background:var(--glass-subtle,rgba(255,255,255,0.06)); color:var(--text-primary,#fff); }
    .post-action-btn.active { color:var(--primary,#7c3aed); }
    .like-btn.active { color:#ef4444; }
    .action-icon { font-size:1.05rem; }
    .action-count { font-size:0.82rem; }
    .post-action-btn:last-child { margin-left:auto; }
    .comments-section { border-top:1px solid var(--glass-border,rgba(255,255,255,0.06)); margin-top:14px; padding-top:14px; }
    .post-link { color:var(--primary,#7c3aed); text-decoration:underline; word-break:break-all; }
    /* Skeleton */
    .skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 100%); background-size:200% 100%; animation:skeleton-shine 1.4s ease infinite; border-radius:8px; }
    .skeleton-circle { border-radius:50%; }
    .skeleton-text { border-radius:4px; }
    @keyframes skeleton-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    /* Post options dropdown */
    .post-options-dropdown { position:absolute; right:0; top:36px; background:var(--bg-card,#1a1a2e); border:1px solid var(--glass-border,rgba(255,255,255,0.1)); border-radius:12px; min-width:150px; z-index:50; box-shadow:0 8px 32px rgba(0,0,0,0.4); overflow:hidden; }
    .post-options-dropdown button { display:flex; align-items:center; gap:8px; width:100%; padding:10px 14px; border:none; background:transparent; color:var(--text-primary,#fff); font-size:0.88rem; cursor:pointer; text-align:left; transition:background 0.15s ease; }
    .post-options-dropdown button:hover { background:var(--glass-subtle,rgba(255,255,255,0.06)); }
    .post-options-dropdown button.danger { color:var(--danger,#ef4444); }
    .animate-fade-in { animation:fadeIn 0.3s ease forwards; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(style);
}

export function renderPost(post, currentUser) {
  injectPostStyles();
  const isLiked      = Array.isArray(post.likes)      && post.likes.includes(currentUser?.uid);
  const isBookmarked = Array.isArray(post.bookmarks)   && post.bookmarks.includes(currentUser?.uid);
  const isOwner      = post.authorId === currentUser?.uid;

  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=7c3aed&color=fff`;

  return `
    <article class="post-card glass animate-fade-in" data-post-id="${post.id}">
      <div class="post-header">
        <a href="/profile/${post.authorUsername || post.authorId}" data-link class="post-author-link">
          <img src="${post.authorAvatar || avatarFallback}"
               alt="${post.authorName || 'User'}"
               class="avatar avatar-sm"
               onerror="this.src='${avatarFallback}'">
          <div class="post-author-info">
            <div class="post-author-name">${post.authorName || 'User'}</div>
            <div class="post-author-meta">
              <span>@${post.authorUsername || 'user'}</span>
              <span>·</span>
              <span class="post-time">${formatRelativeTime(post.createdAt)}</span>
              ${post.isEdited ? '<span>· edited</span>' : ''}
            </div>
          </div>
        </a>
        <div style="position:relative;">
          <button class="btn btn-icon btn-ghost post-options-btn" data-post-id="${post.id}" aria-label="Post options">⋯</button>
        </div>
      </div>

      <div class="post-body">
        <p class="post-content">${linkifyText(post.content || '')}</p>
        ${post.mediaURL ? `
          <div class="post-media">
            ${post.mediaType === 'video'
              ? `<video src="${post.mediaURL}" controls class="post-video" preload="metadata"></video>`
              : `<img src="${post.mediaURL}" alt="Post image" class="post-image" loading="lazy">`
            }
          </div>
        ` : ''}
        ${post.hashtags?.length ? `
          <div class="post-hashtags">
            ${post.hashtags.map(tag => `<a href="/explore?tag=${encodeURIComponent(tag)}" data-link class="hashtag">#${tag}</a>`).join(' ')}
          </div>
        ` : ''}
      </div>

      <div class="post-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'active' : ''}" data-post-id="${post.id}" data-action="like" aria-label="Like post" aria-pressed="${isLiked}">
          <span class="action-icon">${isLiked ? '❤️' : '🤍'}</span>
          <span class="action-count">${formatNumber(post.likeCount || 0)}</span>
        </button>
        <button class="post-action-btn comment-btn" data-post-id="${post.id}" data-action="comment" aria-label="Comment">
          <span class="action-icon">💬</span>
          <span class="action-count">${formatNumber(post.commentCount || 0)}</span>
        </button>
        <button class="post-action-btn share-btn" data-post-id="${post.id}" data-action="share" aria-label="Share">
          <span class="action-icon">🔗</span>
          <span class="action-count">${formatNumber(post.shareCount || 0)}</span>
        </button>
        <button class="post-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" data-post-id="${post.id}" data-action="bookmark" aria-label="Bookmark" aria-pressed="${isBookmarked}" style="margin-left:auto;">
          <span class="action-icon">${isBookmarked ? '🔖' : '📄'}</span>
        </button>
      </div>
    </article>
  `;
}

export function initPostActions(container) {
  if (!container) return;
  injectPostStyles();

  container.addEventListener('click', async (e) => {
    // Options button
    const optionsBtn = e.target.closest('.post-options-btn');
    if (optionsBtn) {
      e.stopPropagation();
      const postId   = optionsBtn.dataset.postId;
      const user     = store.getState().user;
      const postCard = optionsBtn.closest('.post-card');
      showPostOptionsMenu(optionsBtn, postId, user, postCard);
      return;
    }

    // Action buttons
    const btn = e.target.closest('.post-action-btn');
    if (!btn) return;

    const postId = btn.dataset.postId;
    const action = btn.dataset.action;
    const user   = store.getState().user;
    if (!user) { showToast('Please log in first', 'error'); return; }

    if (action === 'like') {
      const wasActive = btn.classList.contains('active');
      btn.classList.toggle('active');
      const icon     = btn.querySelector('.action-icon');
      const countEl  = btn.querySelector('.action-count');
      const isLiking = btn.classList.contains('active');
      icon.textContent = isLiking ? '❤️' : '🤍';
      btn.setAttribute('aria-pressed', String(isLiking));
      const cur = parseInt(countEl.textContent) || 0;
      countEl.textContent = formatNumber(Math.max(0, cur + (isLiking ? 1 : -1)));
      try {
        await likePost(postId, user.uid);
      } catch {
        btn.classList.toggle('active');
        icon.textContent = wasActive ? '❤️' : '🤍';
        countEl.textContent = formatNumber(Math.max(0, cur));
      }
    }

    if (action === 'comment') {
      const postCard = btn.closest('.post-card');
      await toggleComments(postCard, postId);
    }

    if (action === 'share') {
      const url = `${location.origin}/posts/${postId}`;
      try {
        await navigator.share?.({ url });
      } catch {
        navigator.clipboard?.writeText(url).catch(() => {});
        showToast('Link copied!', 'success');
      }
      try { await sharePost(postId, user.uid); } catch { /* silent */ }
    }

    if (action === 'bookmark') {
      const wasActive = btn.classList.contains('active');
      btn.classList.toggle('active');
      const icon      = btn.querySelector('.action-icon');
      const isMarked  = btn.classList.contains('active');
      icon.textContent = isMarked ? '🔖' : '📄';
      btn.setAttribute('aria-pressed', String(isMarked));
      try {
        await bookmarkPost(postId, user.uid);
      } catch {
        btn.classList.toggle('active');
        icon.textContent = wasActive ? '🔖' : '📄';
      }
    }
  });
}

function showPostOptionsMenu(trigger, postId, user, postCard) {
  document.querySelectorAll('.post-options-dropdown').forEach(d => d.remove());
  const dropdown = document.createElement('div');
  dropdown.className = 'post-options-dropdown';

  const isOwner = postCard?.querySelector(`[data-post-id="${postId}"]`)?.closest('.post-card')
    ?.dataset?.authorId === user?.uid;

  const addOpt = (icon, label, onClick, danger = false) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (danger) btn.className = 'danger';
    btn.innerHTML = `<span>${icon}</span><span>${label}</span>`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.remove(); onClick(); });
    dropdown.appendChild(btn);
  };

  addOpt('🔗', 'Copy Link', () => {
    navigator.clipboard?.writeText(`${location.origin}/posts/${postId}`);
    showToast('Link copied!', 'success');
  });
  addOpt('🔍', 'View Post', () => router.navigate(`/posts/${postId}`));

  if (isOwner) {
    addOpt('🗑️', 'Delete', async () => {
      if (!confirm('Delete this post?')) return;
      try {
        const { deletePost } = await import('../../services/post.service.js');
        await deletePost(postId, user.uid);
        postCard?.remove();
        showToast('Post deleted', 'success');
      } catch { showToast('Failed to delete', 'error'); }
    }, true);
  } else {
    addOpt('🚩', 'Report', () => showToast('Post reported', 'info'));
  }

  trigger.parentElement.style.position = 'relative';
  trigger.parentElement.appendChild(dropdown);

  const close = (ev) => {
    if (!dropdown.contains(ev.target)) { dropdown.remove(); document.removeEventListener('click', close); }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

async function toggleComments(postCard, postId) {
  let section = postCard?.querySelector('.comments-section');
  if (section) { section.remove(); return; }
  section = document.createElement('div');
  section.className = 'comments-section';
  section.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.85rem;">Loading comments…</div>';
  postCard?.appendChild(section);
  try {
    const { renderCommentList, initCommentList } = await import('../social/commentList.js');
    section.innerHTML = await renderCommentList(postId);
    initCommentList(section, postId);
  } catch (err) {
    section.innerHTML = '<div style="padding:12px;color:var(--danger,#ef4444);font-size:0.85rem;">Could not load comments.</div>';
  }
}

export function renderPostSkeleton() {
  return `
    <div class="post-card glass">
      <div class="post-header">
        <div class="skeleton skeleton-circle" style="width:40px;height:40px;flex-shrink:0;"></div>
        <div style="flex:1;margin-left:12px;display:flex;flex-direction:column;gap:6px;">
          <div class="skeleton skeleton-text" style="width:130px;height:14px;"></div>
          <div class="skeleton skeleton-text" style="width:90px;height:12px;"></div>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
        <div class="skeleton skeleton-text" style="width:100%;height:14px;"></div>
        <div class="skeleton skeleton-text" style="width:85%;height:14px;"></div>
        <div class="skeleton skeleton-text" style="width:60%;height:14px;"></div>
        <div class="skeleton" style="width:100%;height:220px;border-radius:14px;margin-top:8px;"></div>
      </div>
      <div class="post-actions" style="margin-top:16px;">
        <div class="skeleton skeleton-text" style="width:50px;height:28px;border-radius:100px;"></div>
        <div class="skeleton skeleton-text" style="width:50px;height:28px;border-radius:100px;"></div>
        <div class="skeleton skeleton-text" style="width:50px;height:28px;border-radius:100px;"></div>
        <div class="skeleton skeleton-text" style="width:32px;height:28px;border-radius:100px;margin-left:auto;"></div>
      </div>
    </div>
  `;
}
