import { store } from '../../core/store.js';
import { formatRelativeTime } from '../../utils/formatters.js';
import { showToast } from '../../utils/dom.js';

function injectCommentStyles() {
  if (document.getElementById('comment-styles')) return;
  const s = document.createElement('style');
  s.id = 'comment-styles';
  s.textContent = `
    .comment-list { display:flex; flex-direction:column; gap:2px; }
    .comment-item { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--glass-border,rgba(255,255,255,0.05)); }
    .comment-item:last-child { border-bottom:none; }
    .comment-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0; }
    .comment-body { flex:1; min-width:0; }
    .comment-header { display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
    .comment-author { font-weight:700; font-size:0.85rem; color:var(--text-primary,#fff); text-decoration:none; }
    .comment-author:hover { text-decoration:underline; }
    .comment-time { font-size:0.72rem; color:var(--text-muted,rgba(255,255,255,0.4)); }
    .comment-text { font-size:0.88rem; color:var(--text-primary,#fff); line-height:1.55; margin-top:4px; word-break:break-word; }
    .comment-actions { display:flex; align-items:center; gap:12px; margin-top:6px; }
    .comment-action-btn { background:none; border:none; color:var(--text-muted,rgba(255,255,255,0.4)); font-size:0.78rem; cursor:pointer; padding:0; display:flex; align-items:center; gap:4px; transition:color 0.15s; }
    .comment-action-btn:hover { color:var(--text-primary,#fff); }
    .comment-action-btn.active { color:var(--primary,#7c3aed); }
    .comment-like-count { font-size:0.75rem; }
    .comment-reply-indent { padding-left:42px; }
    .reply-input-wrap { display:flex; gap:8px; align-items:flex-end; padding:8px 0 4px; }
    .reply-input { flex:1; background:var(--glass-subtle,rgba(255,255,255,0.06)); border:1px solid var(--glass-border,rgba(255,255,255,0.1)); border-radius:10px; color:var(--text-primary,#fff); font-family:inherit; font-size:0.85rem; padding:8px 12px; outline:none; resize:none; min-height:36px; max-height:120px; overflow-y:auto; }
    .reply-input:focus { border-color:var(--primary,#7c3aed); }
    .reply-submit-btn { padding:8px 14px; background:var(--gradient-primary,linear-gradient(135deg,#7c3aed,#3b82f6)); color:#fff; border:none; border-radius:10px; font-size:0.82rem; font-weight:600; cursor:pointer; flex-shrink:0; }
    .comment-input-area { display:flex; gap:10px; padding:10px 0 0; align-items:flex-end; }
    .comment-input-textarea { flex:1; background:var(--glass-subtle,rgba(255,255,255,0.06)); border:1px solid var(--glass-border,rgba(255,255,255,0.1)); border-radius:12px; color:var(--text-primary,#fff); font-family:inherit; font-size:0.88rem; padding:10px 14px; outline:none; resize:none; min-height:40px; max-height:130px; overflow-y:auto; transition:border-color 0.2s; }
    .comment-input-textarea:focus { border-color:var(--primary,#7c3aed); }
    .comment-submit-btn { padding:10px 16px; background:var(--gradient-primary,linear-gradient(135deg,#7c3aed,#3b82f6)); color:#fff; border:none; border-radius:12px; font-size:0.88rem; font-weight:600; cursor:pointer; flex-shrink:0; transition:opacity 0.2s; }
    .comment-submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .load-more-comments-btn { width:100%; padding:8px; background:none; border:1px solid var(--glass-border,rgba(255,255,255,0.1)); border-radius:10px; color:var(--text-muted,rgba(255,255,255,0.5)); font-size:0.82rem; cursor:pointer; margin-top:8px; transition:all 0.2s; }
    .load-more-comments-btn:hover { background:var(--glass-subtle,rgba(255,255,255,0.05)); color:var(--text-primary,#fff); }
    .comment-skeleton { display:flex; gap:10px; padding:10px 0; }
    .sk { background:linear-gradient(90deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 100%); background-size:200% 100%; animation:sk-shine 1.4s ease infinite; border-radius:6px; }
    @keyframes sk-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `;
  document.head.appendChild(s);
}

export async function renderCommentList(postId) {
  injectCommentStyles();
  try {
    const { getComments } = await import('../../services/post.service.js');
    const comments = await getComments(postId, 10);
    const user = store.getState().user;
    return `
      <div class="comment-list" id="comment-list-${postId}" data-post-id="${postId}">
        ${comments.length === 0
          ? `<div style="padding:12px 0;font-size:0.85rem;color:var(--text-muted,rgba(255,255,255,0.4));">No comments yet. Be the first!</div>`
          : comments.map(c => renderCommentItem(c, user)).join('')
        }
        ${comments.length >= 10 ? `<button class="load-more-comments-btn" data-last="${comments[comments.length - 1]?.id}">Load more comments</button>` : ''}
      </div>
      ${user ? renderCommentInput(postId, user) : ''}
    `;
  } catch {
    return `<div style="padding:10px;color:var(--danger,#ef4444);font-size:0.85rem;">Failed to load comments.</div>`;
  }
}

export function renderCommentItem(comment, currentUser) {
  const isOwner = comment.authorId === currentUser?.uid;
  const isLiked = Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid);
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName || 'U')}&background=7c3aed&color=fff`;

  return `
    <div class="comment-item" id="comment-${comment.id}" data-comment-id="${comment.id}">
      <img src="${comment.authorAvatar || avatarFallback}"
           alt="${comment.authorName || 'User'}"
           class="comment-avatar"
           onerror="this.src='${avatarFallback}'">
      <div class="comment-body">
        <div class="comment-header">
          <a href="/profile/${comment.authorUsername || comment.authorId}" data-link class="comment-author">${comment.authorName || 'User'}</a>
          <span class="comment-time">${formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p class="comment-text">${escapeHTML(comment.text || '')}</p>
        <div class="comment-actions">
          <button class="comment-action-btn comment-like-btn ${isLiked ? 'active' : ''}"
                  data-comment-id="${comment.id}" aria-label="Like comment" aria-pressed="${isLiked}">
            ${isLiked ? '❤️' : '🤍'} <span class="comment-like-count">${comment.likeCount || 0}</span>
          </button>
          <button class="comment-action-btn comment-reply-btn" data-comment-id="${comment.id}" aria-label="Reply">
            💬 Reply
          </button>
          ${isOwner ? `<button class="comment-action-btn comment-delete-btn" data-comment-id="${comment.id}" aria-label="Delete comment">🗑️</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderCommentInput(postId, user) {
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=7c3aed&color=fff`;
  return `
    <div class="comment-input-area" id="comment-input-area-${postId}">
      <img src="${user?.photoURL || avatarFallback}" alt="${user?.displayName}" class="comment-avatar"
           onerror="this.src='${avatarFallback}'">
      <textarea class="comment-input-textarea" placeholder="Write a comment…" rows="1"
                id="comment-textarea-${postId}" aria-label="Write a comment" maxlength="1000"></textarea>
      <button class="comment-submit-btn" id="comment-submit-${postId}" disabled>Post</button>
    </div>
  `;
}

export function initCommentList(container, postId) {
  if (!container) return;
  injectCommentStyles();

  const user = store.getState().user;
  let lastVisible = null;

  // Comment textarea enable/disable submit
  const textarea = container.querySelector(`#comment-textarea-${postId}`);
  const submitBtn = container.querySelector(`#comment-submit-${postId}`);
  if (textarea && submitBtn) {
    textarea.addEventListener('input', () => {
      submitBtn.disabled = !textarea.value.trim();
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 130) + 'px';
    });

    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text || !user) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';
      try {
        const { addComment } = await import('../../services/post.service.js');
        const comment = await addComment(postId, {
          text,
          authorId:       user.uid,
          authorName:     user.displayName,
          authorUsername: user.username,
          authorAvatar:   user.photoURL,
        });
        textarea.value = '';
        textarea.style.height = 'auto';
        submitBtn.disabled = true;
        const list = container.querySelector(`#comment-list-${postId}`);
        if (list) {
          const div = document.createElement('div');
          div.innerHTML = renderCommentItem(comment, user);
          list.prepend(div.firstElementChild);
        }
      } catch {
        showToast('Failed to post comment', 'error');
      } finally {
        submitBtn.textContent = 'Post';
      }
    });
  }

  // Delegate: like, reply, delete, load-more
  container.addEventListener('click', async (e) => {
    // Like comment
    const likeBtn = e.target.closest('.comment-like-btn');
    if (likeBtn) {
      if (!user) return;
      const commentId = likeBtn.dataset.commentId;
      const wasActive = likeBtn.classList.contains('active');
      likeBtn.classList.toggle('active');
      const countEl = likeBtn.querySelector('.comment-like-count');
      const cur = parseInt(countEl?.textContent) || 0;
      if (countEl) countEl.textContent = Math.max(0, cur + (wasActive ? -1 : 1));
      likeBtn.innerHTML = (likeBtn.classList.contains('active') ? '❤️' : '🤍') +
        ` <span class="comment-like-count">${Math.max(0, cur + (wasActive ? -1 : 1))}</span>`;
      likeBtn.className = `comment-action-btn comment-like-btn ${likeBtn.classList.contains('active') ? 'active' : ''}`;
      try {
        const { likeComment } = await import('../../services/post.service.js');
        await likeComment(postId, commentId, user.uid);
      } catch { /* silent */ }
      return;
    }

    // Reply
    const replyBtn = e.target.closest('.comment-reply-btn');
    if (replyBtn) {
      const commentId   = replyBtn.dataset.commentId;
      const commentItem = container.querySelector(`#comment-${commentId}`);
      if (!commentItem) return;
      const existing = commentItem.querySelector('.reply-input-wrap');
      if (existing) { existing.remove(); return; }
      if (!user) { showToast('Log in to reply', 'error'); return; }
      const wrap = document.createElement('div');
      wrap.className = 'reply-input-wrap comment-reply-indent';
      wrap.innerHTML = `
        <textarea class="reply-input" placeholder="Write a reply…" rows="1" aria-label="Write a reply" maxlength="500"></textarea>
        <button class="reply-submit-btn">Reply</button>
      `;
      commentItem.appendChild(wrap);
      wrap.querySelector('.reply-input')?.focus();

      wrap.querySelector('.reply-submit-btn')?.addEventListener('click', async () => {
        const text = wrap.querySelector('.reply-input')?.value.trim();
        if (!text) return;
        try {
          const { addComment } = await import('../../services/post.service.js');
          await addComment(postId, {
            text,
            parentId:       commentId,
            authorId:       user.uid,
            authorName:     user.displayName,
            authorUsername: user.username,
            authorAvatar:   user.photoURL,
          });
          wrap.remove();
          showToast('Reply posted!', 'success');
        } catch { showToast('Failed to reply', 'error'); }
      });
      return;
    }

    // Delete
    const deleteBtn = e.target.closest('.comment-delete-btn');
    if (deleteBtn) {
      if (!confirm('Delete this comment?')) return;
      const commentId   = deleteBtn.dataset.commentId;
      const commentItem = container.querySelector(`#comment-${commentId}`);
      try {
        const { deleteComment } = await import('../../services/post.service.js');
        await deleteComment(postId, commentId, user.uid);
        commentItem?.remove();
        showToast('Comment deleted', 'success');
      } catch { showToast('Failed to delete', 'error'); }
      return;
    }

    // Load more
    const loadMoreBtn = e.target.closest('.load-more-comments-btn');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = 'Loading…';
      loadMoreBtn.disabled = true;
      try {
        const { getComments } = await import('../../services/post.service.js');
        const more = await getComments(postId, 10, loadMoreBtn.dataset.last);
        const list = container.querySelector(`#comment-list-${postId}`);
        more.forEach(c => {
          const div = document.createElement('div');
          div.innerHTML = renderCommentItem(c, user);
          list?.insertBefore(div.firstElementChild, loadMoreBtn);
        });
        if (more.length < 10) {
          loadMoreBtn.remove();
        } else {
          loadMoreBtn.dataset.last = more[more.length - 1]?.id;
          loadMoreBtn.textContent = 'Load more comments';
          loadMoreBtn.disabled = false;
        }
      } catch {
        loadMoreBtn.textContent = 'Load more comments';
        loadMoreBtn.disabled = false;
      }
    }
  });
}

export function renderCommentSkeleton() {
  return `
    <div class="comment-skeleton">
      <div class="sk" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
        <div class="sk" style="width:120px;height:12px;"></div>
        <div class="sk" style="width:100%;height:12px;"></div>
        <div class="sk" style="width:75%;height:12px;"></div>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
