import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDB, getStorageInstance } from './firebase.js';
import { getOrCreateChat, sendMessage } from './chat.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Firestore Timestamp 24 hours from now. */
function expiresAt() {
  const ms = Date.now() + 24 * 60 * 60 * 1000;
  return Timestamp.fromMillis(ms);
}

async function uploadMedia(uid, file, onProgress) {
  const ext = file.name.split('.').pop();
  const path = `stories/${uid}/${Date.now()}.${ext}`;
  const fileRef = ref(getStorageInstance(), path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file);
    task.on(
      'state_changed',
      snapshot => {
        if (typeof onProgress === 'function') {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new story that expires in 24 hours.
 * @param {string} uid
 * @param {Object} userData - { displayName, photoURL, username }
 * @param {string|null} mediaURL
 * @param {string|null} mediaType - 'image'|'video'
 * @param {string} [text]
 * @param {string} [backgroundColor] - CSS colour for text-only stories.
 * @returns {Promise<Object>} Created story.
 */
export async function createStory(uid, userData, mediaURL, mediaType, text = '', backgroundColor = '#000000') {
  try {
    const db = getDB();
    const storyData = {
      authorId:        uid,
      authorName:      userData.displayName || '',
      authorAvatar:    userData.photoURL    || '',
      authorUsername:  userData.username    || '',
      mediaURL,
      mediaType,
      text,
      backgroundColor,
      viewers:         [],
      viewCount:       0,
      isDeleted:       false,
      createdAt:       serverTimestamp(),
      expiresAt:       expiresAt()
    };

    const storyRef = await addDoc(collection(db, 'stories'), storyData);
    return { id: storyRef.id, ...storyData };
  } catch (err) {
    console.error('createStory error:', err);
    throw new Error('Failed to create story.');
  }
}

/**
 * Delete a story (owner only).
 * @param {string} storyId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteStory(storyId, uid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'stories', storyId));
    if (!snap.exists()) throw new Error('Story not found.');
    if (snap.data().authorId !== uid) throw new Error('Unauthorized.');
    await updateDoc(doc(db, 'stories', storyId), { isDeleted: true });
  } catch (err) {
    console.error('deleteStory error:', err);
    throw new Error(err.message || 'Failed to delete story.');
  }
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

/**
 * Get active (non-expired, non-deleted) stories from a list of UIDs,
 * grouped by author UID.
 * @param {string[]} followingUids
 * @returns {Promise<Object>} Map of authorId -> story[]
 */
export async function getActiveStories(followingUids) {
  try {
    if (!followingUids.length) return {};
    const db = getDB();
    const now = Timestamp.now();
    const grouped = {};

    // Firestore 'in' supports up to 30 values; chunk if necessary
    const chunks = [];
    for (let i = 0; i < followingUids.length; i += 30) {
      chunks.push(followingUids.slice(i, i + 30));
    }

    await Promise.all(chunks.map(async chunk => {
      const q = query(
        collection(db, 'stories'),
        where('authorId', 'in', chunk),
        where('isDeleted', '==', false),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc'),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
        if (!grouped[data.authorId]) grouped[data.authorId] = [];
        grouped[data.authorId].push(data);
      });
    }));

    return grouped;
  } catch (err) {
    console.error('getActiveStories error:', err);
    throw new Error('Failed to load stories.');
  }
}

/**
 * Get all active stories for a single user.
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getUserStories(uid) {
  try {
    const db = getDB();
    const now = Timestamp.now();
    const q = query(
      collection(db, 'stories'),
      where('authorId', '==', uid),
      where('isDeleted', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getUserStories error:', err);
    throw new Error('Failed to load user stories.');
  }
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Record that a user has viewed a story.
 * @param {string} storyId
 * @param {string} viewerUid
 * @returns {Promise<void>}
 */
export async function viewStory(storyId, viewerUid) {
  try {
    const db = getDB();
    const storyRef = doc(db, 'stories', storyId);
    const snap = await getDoc(storyRef);
    if (!snap.exists()) return;
    const story = snap.data();

    // Avoid duplicate views
    if ((story.viewers || []).includes(viewerUid)) return;

    await updateDoc(storyRef, {
      viewers:   arrayUnion(viewerUid),
      viewCount: (story.viewCount || 0) + 1
    });

    // Notify story author (skip self-views)
    if (story.authorId !== viewerUid) {
      const { createNotification } = await import('./notification.service.js');
      await createNotification(story.authorId, viewerUid, {}, 'story_view', { storyId }).catch(() => {});
    }
  } catch (err) {
    console.error('viewStory error:', err);
  }
}

/**
 * Get the viewer list for a story (owner only).
 * @param {string} storyId
 * @param {string} uid - Must match story authorId.
 * @returns {Promise<string[]>} Array of viewer UIDs.
 */
export async function getStoryViewers(storyId, uid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'stories', storyId));
    if (!snap.exists()) throw new Error('Story not found.');
    if (snap.data().authorId !== uid) throw new Error('Unauthorized.');
    return snap.data().viewers || [];
  } catch (err) {
    console.error('getStoryViewers error:', err);
    throw new Error(err.message || 'Failed to load story viewers.');
  }
}

/**
 * Check if a user has already viewed a story.
 * @param {string} storyId
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function hasViewed(storyId, uid) {
  try {
    const snap = await getDoc(doc(getDB(), 'stories', storyId));
    if (!snap.exists()) return false;
    return (snap.data().viewers || []).includes(uid);
  } catch (err) {
    console.error('hasViewed error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload story media to Firebase Storage.
 * @param {string} uid
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<string>} Download URL.
 */
export async function uploadStoryMedia(uid, file, onProgress) {
  try {
    return await uploadMedia(uid, file, onProgress);
  } catch (err) {
    console.error('uploadStoryMedia error:', err);
    throw new Error('Failed to upload story media.');
  }
}

// ---------------------------------------------------------------------------
// Real-time
// ---------------------------------------------------------------------------

/**
 * Subscribe to active stories from followed users.
 * @param {string[]} followingUids
 * @param {Function} callback - Receives grouped stories map { authorId: story[] }
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToStories(followingUids, callback) {
  if (!followingUids.length) {
    callback({});
    return () => {};
  }

  const db = getDB();
  const now = Timestamp.now();

  // Only subscribe to first chunk (30 UIDs); for larger lists call getActiveStories
  const chunk = followingUids.slice(0, 30);
  const q = query(
    collection(db, 'stories'),
    where('authorId', 'in', chunk),
    where('isDeleted', '==', false),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'asc'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, snap => {
    const grouped = {};
    snap.docs.forEach(d => {
      const data = { id: d.id, ...d.data() };
      if (!grouped[data.authorId]) grouped[data.authorId] = [];
      grouped[data.authorId].push(data);
    });
    callback(grouped);
  }, err => {
    console.error('subscribeToStories error:', err);
  });
}

// ---------------------------------------------------------------------------
// Story replies
// ---------------------------------------------------------------------------

/**
 * Reply to a story by sending a direct message to the story author.
 * @param {string} storyId
 * @param {string} viewerUid
 * @param {Object} viewerData - { displayName, photoURL, username }
 * @param {string} message
 * @returns {Promise<Object>} Sent message.
 */
export async function replyToStory(storyId, viewerUid, viewerData, message) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'stories', storyId));
    if (!snap.exists()) throw new Error('Story not found.');
    const story = snap.data();

    const chat = await getOrCreateChat(viewerUid, story.authorId);
    return await sendMessage(
      chat.id,
      viewerUid,
      viewerData,
      `[Story reply] ${message}`,
      null,
      null
    );
  } catch (err) {
    console.error('replyToStory error:', err);
    throw new Error('Failed to send story reply.');
  }
}
