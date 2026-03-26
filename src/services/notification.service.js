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
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  getCountFromServer,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDB } from './firebase.js';

// ---------------------------------------------------------------------------
// Valid notification types
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set([
  'like',
  'comment',
  'follow',
  'follow_request',
  'follow_accept',
  'mention',
  'project_star',
  'project_access',
  'message',
  'story_view',
  'story_reply',
  'system'
]);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a notification for a user.
 * @param {string} toUid         - Recipient.
 * @param {string} fromUid       - Actor.
 * @param {Object} fromUserData  - { displayName, photoURL, username }
 * @param {string} type          - One of VALID_TYPES.
 * @param {Object} [data={}]     - Extra contextual data (postId, projectId, etc.)
 * @returns {Promise<Object>} Created notification.
 */
export async function createNotification(toUid, fromUid, fromUserData, type, data = {}) {
  try {
    // Don't notify the actor themselves
    if (toUid === fromUid) return null;
    if (!VALID_TYPES.has(type)) {
      console.warn(`createNotification: unknown type "${type}"`);
      return null;
    }

    const db = getDB();
    const notifData = {
      toUid,
      fromUid,
      fromDisplayName: fromUserData?.displayName || '',
      fromPhotoURL:    fromUserData?.photoURL    || '',
      fromUsername:    fromUserData?.username    || '',
      type,
      data,
      isRead:    false,
      createdAt: serverTimestamp()
    };

    const ref = await addDoc(collection(db, 'notifications'), notifData);
    return { id: ref.id, ...notifData };
  } catch (err) {
    console.error('createNotification error:', err);
    // Notifications are non-critical; do not rethrow
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Get paginated notifications for a user (newest first).
 * @param {string} uid
 * @param {number} [pageLimit=20]
 * @param {Object|null} [lastDoc=null]
 * @returns {Promise<{notifications: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getNotifications(uid, pageLimit = 20, lastDoc = null) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { notifications, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getNotifications error:', err);
    throw new Error('Failed to load notifications.');
  }
}

// ---------------------------------------------------------------------------
// Real-time
// ---------------------------------------------------------------------------

/**
 * Subscribe to real-time notifications for a user.
 * @param {string} uid
 * @param {Function} callback - Receives notifications array.
 * @returns {Function} Unsubscribe.
 */
export function subscribeToNotifications(uid, callback) {
  const db = getDB();
  const q = query(
    collection(db, 'notifications'),
    where('toUid', '==', uid),
    orderBy('createdAt', 'desc'),
    firestoreLimit(50)
  );
  return onSnapshot(q, snap => {
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(notifications);
  }, err => {
    console.error('subscribeToNotifications error:', err);
  });
}

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  try {
    await updateDoc(doc(getDB(), 'notifications', notificationId), { isRead: true });
  } catch (err) {
    console.error('markAsRead error:', err);
  }
}

/**
 * Mark all unread notifications for a user as read in a batch.
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function markAllAsRead(uid) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  } catch (err) {
    console.error('markAllAsRead error:', err);
    throw new Error('Failed to mark notifications as read.');
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Delete a specific notification (recipient only).
 * @param {string} notificationId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId, uid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'notifications', notificationId));
    if (!snap.exists()) return;
    if (snap.data().toUid !== uid) throw new Error('Unauthorized.');
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (err) {
    console.error('deleteNotification error:', err);
    throw new Error(err.message || 'Failed to delete notification.');
  }
}

/**
 * Delete all notifications older than 30 days for a user.
 * @param {string} uid
 * @returns {Promise<number>} Number of deleted notifications.
 */
export async function deleteOldNotifications(uid) {
  try {
    const db = getDB();
    const cutoff = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      where('createdAt', '<', cutoff)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return snap.docs.length;
  } catch (err) {
    console.error('deleteOldNotifications error:', err);
    throw new Error('Failed to clean up old notifications.');
  }
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

/**
 * Get the count of unread notifications for a user.
 * @param {string} uid
 * @returns {Promise<number>}
 */
export async function getUnreadCount(uid) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      where('isRead', '==', false)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}
