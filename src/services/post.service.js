import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDB } from './firebase.js';
import { createNotification } from './notification.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract hashtags from post content. */
function parseHashtags(text) {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(matches.map(h => h.slice(1).toLowerCase()))];
}

/** Extract @mentions from post content. */
function parseMentions(text) {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

/**
 * Increment or decrement a hashtag's usage count in the 'hashtags' collection.
 * @param {string[]} tags
 * @param {1|-1} delta
 */
async function updateHashtagCounts(tags, delta) {
  const db = getDB();
  const batch = writeBatch(db);
  tags.forEach(tag => {
    const ref = doc(db, 'hashtags', tag);
    batch.set(ref, { tag, count: increment(delta), updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit().catch(err => console.warn('hashtag count update failed:', err));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new post.
 * @param {string} uid - Author UID.
 * @param {Object} data
 * @param {string} data.content
 * @param {string} [data.mediaURL]
 * @param {string} [data.mediaType] - 'image'|'video'|'audio'|null
 * @param {string} data.authorName
 * @param {string} data.authorUsername
 * @param {string} data.authorAvatar
 * @returns {Promise<Object>} Created post with id.
 */
export async function createPost(uid, data) {
  try {
    const db = getDB();
    const hashtags = parseHashtags(data.content || '');
    const mentions = parseMentions(data.content || '');

    const postData = {
      content:        data.content || '',
      mediaURL:       data.mediaURL    || null,
      mediaType:      data.mediaType   || null,
      hashtags,
      mentions,
      likes:          [],
      likeCount:      0,
      commentCount:   0,
      shareCount:     0,
      bookmarks:      [],
      bookmarkCount:  0,
      authorId:       uid,
      authorName:     data.authorName     || '',
      authorAvatar:   data.authorAvatar   || '',
      authorUsername: data.authorUsername || '',
      isDeleted:      false,
      createdAt:      serverTimestamp(),
      updatedAt:      serverTimestamp()
    };

    const ref = await addDoc(collection(db, 'posts'), postData);

    // Increment user post count
    await updateDoc(doc(db, 'users', uid), { postCount: increment(1) });

    // Update hashtag index
    if (hashtags.length) await updateHashtagCounts(hashtags, 1);

    return { id: ref.id, ...postData };
  } catch (err) {
    console.error('createPost error:', err);
    throw new Error('Failed to create post.');
  }
}

/**
 * Delete a post (must be owner).
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deletePost(postId, uid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) throw new Error('Post not found.');
    const post = snap.data();
    if (post.authorId !== uid) throw new Error('Unauthorized.');

    await deleteDoc(doc(db, 'posts', postId));
    await updateDoc(doc(db, 'users', uid), { postCount: increment(-1) }).catch(() => {});
    if (post.hashtags?.length) await updateHashtagCounts(post.hashtags, -1);
  } catch (err) {
    console.error('deletePost error:', err);
    throw new Error(err.message || 'Failed to delete post.');
  }
}

/**
 * Update a post's content (must be owner).
 * @param {string} postId
 * @param {string} uid
 * @param {Object} data - Fields to update (content, mediaURL, mediaType).
 * @returns {Promise<void>}
 */
export async function updatePost(postId, uid, data) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) throw new Error('Post not found.');
    if (snap.data().authorId !== uid) throw new Error('Unauthorized.');

    const updates = { updatedAt: serverTimestamp() };
    if (data.content !== undefined) {
      updates.content  = data.content;
      updates.hashtags = parseHashtags(data.content);
      updates.mentions = parseMentions(data.content);
    }
    if (data.mediaURL  !== undefined) updates.mediaURL  = data.mediaURL;
    if (data.mediaType !== undefined) updates.mediaType = data.mediaType;

    await updateDoc(doc(db, 'posts', postId), updates);
  } catch (err) {
    console.error('updatePost error:', err);
    throw new Error(err.message || 'Failed to update post.');
  }
}

/**
 * Get a single post by ID.
 * @param {string} postId
 * @returns {Promise<Object|null>}
 */
export async function getPost(postId) {
  try {
    const snap = await getDoc(doc(getDB(), 'posts', postId));
    if (!snap.exists() || snap.data().isDeleted) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('getPost error:', err);
    throw new Error('Failed to load post.');
  }
}

// ---------------------------------------------------------------------------
// Feed queries
// ---------------------------------------------------------------------------

/**
 * Get paginated feed posts from followed users and the user themselves.
 * @param {string} uid
 * @param {string[]} following  - Array of followed UIDs.
 * @param {Object|null} lastDoc - Last Firestore document for pagination.
 * @param {number} [pageLimit=15]
 * @returns {Promise<{posts: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getFeedPosts(uid, following, lastDoc, pageLimit = 15) {
  try {
    const db = getDB();
    const authorIds = [...new Set([uid, ...following])].slice(0, 10); // Firestore 'in' limit = 10

    let q = query(
      collection(db, 'posts'),
      where('authorId', 'in', authorIds),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { posts, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getFeedPosts error:', err);
    throw new Error('Failed to load feed.');
  }
}

/**
 * Get paginated posts by a specific user.
 * @param {string} uid
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=12]
 * @returns {Promise<{posts: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getUserPosts(uid, lastDoc, pageLimit = 12) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'posts'),
      where('authorId', '==', uid),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { posts, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getUserPosts error:', err);
    throw new Error('Failed to load user posts.');
  }
}

/**
 * Get trending/explore posts ordered by like count.
 * @param {Object|null} lastDoc
 * @param {number} [pageLimit=20]
 * @returns {Promise<{posts: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getExplorePosts(lastDoc, pageLimit = 20) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'posts'),
      where('isDeleted', '==', false),
      orderBy('likeCount', 'desc'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { posts, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getExplorePosts error:', err);
    throw new Error('Failed to load explore posts.');
  }
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggle like on a post.
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<boolean>} true if now liked, false if unliked.
 */
export async function likePost(postId, uid) {
  try {
    const db = getDB();
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Post not found.');
    const liked = (snap.data().likes || []).includes(uid);

    await updateDoc(ref, {
      likes:     liked ? arrayRemove(uid) : arrayUnion(uid),
      likeCount: increment(liked ? -1 : 1)
    });

    if (!liked) {
      const post = snap.data();
      // Notify post author (not self-likes)
      if (post.authorId !== uid) {
        await createNotification(post.authorId, uid, {}, 'like', { postId }).catch(() => {});
      }
    }

    return !liked;
  } catch (err) {
    console.error('likePost error:', err);
    throw new Error('Failed to like post.');
  }
}

/**
 * Toggle bookmark on a post.
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<boolean>} true if now bookmarked.
 */
export async function bookmarkPost(postId, uid) {
  try {
    const db = getDB();
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Post not found.');
    const bookmarked = (snap.data().bookmarks || []).includes(uid);

    await updateDoc(ref, {
      bookmarks:     bookmarked ? arrayRemove(uid) : arrayUnion(uid),
      bookmarkCount: increment(bookmarked ? -1 : 1)
    });

    return !bookmarked;
  } catch (err) {
    console.error('bookmarkPost error:', err);
    throw new Error('Failed to bookmark post.');
  }
}

/**
 * Get all posts bookmarked by a user.
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getBookmarkedPosts(uid) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'posts'),
      where('bookmarks', 'array-contains', uid),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getBookmarkedPosts error:', err);
    throw new Error('Failed to load bookmarks.');
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/**
 * Add a comment to a post.
 * @param {string} postId
 * @param {string} uid
 * @param {Object} userData - { displayName, photoURL, username }
 * @param {string} text
 * @returns {Promise<Object>} Created comment.
 */
export async function addComment(postId, uid, userData, text) {
  try {
    const db = getDB();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error('Post not found.');

    const commentData = {
      authorId:       uid,
      authorName:     userData.displayName || '',
      authorAvatar:   userData.photoURL    || '',
      authorUsername: userData.username    || '',
      text,
      likes:          [],
      likeCount:      0,
      isDeleted:      false,
      createdAt:      serverTimestamp()
    };

    const commentRef = await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
    await updateDoc(postRef, { commentCount: increment(1) });

    const post = postSnap.data();
    if (post.authorId !== uid) {
      await createNotification(post.authorId, uid, userData, 'comment', { postId, commentId: commentRef.id }).catch(() => {});
    }

    return { id: commentRef.id, ...commentData };
  } catch (err) {
    console.error('addComment error:', err);
    throw new Error('Failed to add comment.');
  }
}

/**
 * Delete a comment (must be comment owner or post owner).
 * @param {string} postId
 * @param {string} commentId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteComment(postId, commentId, uid) {
  try {
    const db = getDB();
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found.');

    const postSnap = await getDoc(doc(db, 'posts', postId));
    const isPostOwner = postSnap.exists() && postSnap.data().authorId === uid;
    if (commentSnap.data().authorId !== uid && !isPostOwner) throw new Error('Unauthorized.');

    await updateDoc(commentRef, { isDeleted: true, deletedAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
  } catch (err) {
    console.error('deleteComment error:', err);
    throw new Error(err.message || 'Failed to delete comment.');
  }
}

/**
 * Get paginated comments for a post.
 * @param {string} postId
 * @param {number} [pageLimit=20]
 * @param {Object|null} [lastDoc=null]
 * @returns {Promise<{comments: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getComments(postId, pageLimit = 20, lastDoc = null) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'posts', postId, 'comments'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'asc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { comments, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getComments error:', err);
    throw new Error('Failed to load comments.');
  }
}

/**
 * Toggle like on a comment.
 * @param {string} postId
 * @param {string} commentId
 * @param {string} uid
 * @returns {Promise<boolean>} true if now liked.
 */
export async function likeComment(postId, commentId, uid) {
  try {
    const db = getDB();
    const ref = doc(db, 'posts', postId, 'comments', commentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Comment not found.');
    const liked = (snap.data().likes || []).includes(uid);

    await updateDoc(ref, {
      likes:     liked ? arrayRemove(uid) : arrayUnion(uid),
      likeCount: increment(liked ? -1 : 1)
    });

    return !liked;
  } catch (err) {
    console.error('likeComment error:', err);
    throw new Error('Failed to like comment.');
  }
}

// ---------------------------------------------------------------------------
// Sharing / Reporting
// ---------------------------------------------------------------------------

/**
 * Increment share count on a post.
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function sharePost(postId, uid) {
  try {
    await updateDoc(doc(getDB(), 'posts', postId), { shareCount: increment(1) });
  } catch (err) {
    console.error('sharePost error:', err);
    throw new Error('Failed to record share.');
  }
}

/**
 * Report a post.
 * @param {string} postId
 * @param {string} reporterId
 * @param {string} reason
 * @returns {Promise<void>}
 */
export async function reportPost(postId, reporterId, reason) {
  try {
    const db = getDB();
    const ref = doc(collection(db, 'reports'));
    await setDoc(ref, {
      type:      'post',
      postId,
      reporterId,
      reason,
      status:    'pending',
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('reportPost error:', err);
    throw new Error('Failed to submit report.');
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search posts by hashtag or keyword.
 * @param {string} queryStr
 * @param {number} [maxLimit=20]
 * @returns {Promise<Object[]>}
 */
export async function searchPosts(queryStr, maxLimit = 20) {
  try {
    const db = getDB();
    const term = queryStr.toLowerCase().trim().replace(/^#/, '');
    if (!term) return [];

    // Search by hashtag array membership
    const q = query(
      collection(db, 'posts'),
      where('hashtags', 'array-contains', term),
      where('isDeleted', '==', false),
      orderBy('likeCount', 'desc'),
      firestoreLimit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('searchPosts error:', err);
    throw new Error('Search failed.');
  }
}

/**
 * Get trending hashtags ordered by usage count.
 * @param {number} [maxLimit=10]
 * @returns {Promise<{tag: string, count: number}[]>}
 */
export async function getTrendingHashtags(maxLimit = 10) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'hashtags'),
      orderBy('count', 'desc'),
      firestoreLimit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ tag: d.id, ...d.data() }));
  } catch (err) {
    console.error('getTrendingHashtags error:', err);
    return [];
  }
}
