import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  writeBatch,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDB, getStorageInstance } from './firebase.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a deterministic chat document ID from two user UIDs.
 * @param {string} uid1
 * @param {string} uid2
 * @returns {string}
 */
function buildChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

async function uploadMedia(chatId, senderId, file, onProgress) {
  const ext = file.name.split('.').pop();
  const path = `chats/${chatId}/${senderId}_${Date.now()}.${ext}`;
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
// Chat creation
// ---------------------------------------------------------------------------

/**
 * Find an existing 1-to-1 chat or create a new one.
 * @param {string} uid1
 * @param {string} uid2
 * @returns {Promise<Object>} Chat document.
 */
export async function getOrCreateChat(uid1, uid2) {
  try {
    const db = getDB();
    const chatId = buildChatId(uid1, uid2);
    const chatRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatRef);

    if (snap.exists()) return { id: snap.id, ...snap.data() };

    const chatData = {
      members:     [uid1, uid2],
      isGroup:     false,
      groupName:   null,
      groupAvatar: null,
      lastMessage: null,
      lastMessageAt: null,
      unreadCounts: { [uid1]: 0, [uid2]: 0 },
      typingStatus: {},
      pinnedMessage: null,
      createdAt:   serverTimestamp()
    };

    await setDoc(chatRef, chatData);
    return { id: chatId, ...chatData };
  } catch (err) {
    console.error('getOrCreateChat error:', err);
    throw new Error('Failed to open chat.');
  }
}

/**
 * Start a group chat.
 * @param {string} name
 * @param {string[]} memberUids
 * @param {string} creatorUid
 * @returns {Promise<Object>} Created chat document.
 */
export async function startGroupChat(name, memberUids, creatorUid) {
  try {
    const db = getDB();
    const unreadCounts = {};
    memberUids.forEach(uid => { unreadCounts[uid] = 0; });

    const chatData = {
      members:       [...new Set([...memberUids, creatorUid])],
      isGroup:       true,
      groupName:     name,
      groupAvatar:   null,
      adminUids:     [creatorUid],
      lastMessage:   null,
      lastMessageAt: null,
      unreadCounts,
      typingStatus:  {},
      pinnedMessage: null,
      createdAt:     serverTimestamp()
    };

    const ref = await addDoc(collection(db, 'chats'), chatData);
    return { id: ref.id, ...chatData };
  } catch (err) {
    console.error('startGroupChat error:', err);
    throw new Error('Failed to create group chat.');
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Send a text or media message.
 * @param {string} chatId
 * @param {string} senderId
 * @param {Object} senderData - { displayName, photoURL, username }
 * @param {string|null} text
 * @param {string|null} [mediaURL]
 * @param {string|null} [mediaType] - 'image'|'video'|'audio'|'file'
 * @returns {Promise<Object>} Created message.
 */
export async function sendMessage(chatId, senderId, senderData, text, mediaURL = null, mediaType = null) {
  try {
    const db = getDB();
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) throw new Error('Chat not found.');

    const chatData = chatSnap.data();
    const messageData = {
      senderId,
      senderName:   senderData.displayName || '',
      senderAvatar: senderData.photoURL    || '',
      text:         text || '',
      mediaURL,
      mediaType,
      isDeleted:    false,
      isPinned:     false,
      readBy:       [senderId],
      createdAt:    serverTimestamp()
    };

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    // Increment unread counts for all members except sender
    const unreadUpdate = {};
    (chatData.members || []).forEach(uid => {
      if (uid !== senderId) {
        unreadUpdate[`unreadCounts.${uid}`] = increment(1);
      }
    });

    await updateDoc(chatRef, {
      lastMessage:   text || (mediaType ? `[${mediaType}]` : ''),
      lastMessageAt: serverTimestamp(),
      ...unreadUpdate
    });

    return { id: msgRef.id, ...messageData };
  } catch (err) {
    console.error('sendMessage error:', err);
    throw new Error('Failed to send message.');
  }
}

/**
 * Get paginated messages for a chat (oldest first).
 * @param {string} chatId
 * @param {number} [pageLimit=30]
 * @param {Object|null} [lastDoc=null]
 * @returns {Promise<{messages: Object[], lastDoc: Object|null, hasMore: boolean}>}
 */
export async function getMessages(chatId, pageLimit = 30, lastDoc = null) {
  try {
    const db = getDB();
    let q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageLimit)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    const last = snap.docs[snap.docs.length - 1] || null;
    return { messages, lastDoc: last, hasMore: snap.docs.length === pageLimit };
  } catch (err) {
    console.error('getMessages error:', err);
    throw new Error('Failed to load messages.');
  }
}

/**
 * Subscribe to real-time messages in a chat.
 * @param {string} chatId
 * @param {Function} callback - Receives messages array.
 * @returns {Function} Unsubscribe.
 */
export function subscribeToMessages(chatId, callback) {
  const db = getDB();
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  }, err => {
    console.error('subscribeToMessages error:', err);
  });
}

/**
 * Subscribe to all chats for a user (real-time).
 * @param {string} uid
 * @param {Function} callback - Receives chats array.
 * @returns {Function} Unsubscribe.
 */
export function subscribeToChats(uid, callback) {
  const db = getDB();
  const q = query(
    collection(db, 'chats'),
    where('members', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(chats);
  }, err => {
    console.error('subscribeToChats error:', err);
  });
}

/**
 * Get all chats for a user (one-time fetch).
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getUserChats(uid) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('getUserChats error:', err);
    throw new Error('Failed to load chats.');
  }
}

/**
 * Mark all messages in a chat as read by a user.
 * @param {string} chatId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function markMessagesAsRead(chatId, uid) {
  try {
    const db = getDB();
    await updateDoc(doc(db, 'chats', chatId), {
      [`unreadCounts.${uid}`]: 0
    });

    // Mark individual message readBy arrays
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      if (!(d.data().readBy || []).includes(uid)) {
        batch.update(d.ref, { readBy: arrayUnion(uid) });
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('markMessagesAsRead error:', err);
  }
}

/**
 * Soft-delete a message (sender only).
 * @param {string} chatId
 * @param {string} messageId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteMessage(chatId, messageId, uid) {
  try {
    const db = getDB();
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) throw new Error('Message not found.');
    if (snap.data().senderId !== uid) throw new Error('Unauthorized.');

    await updateDoc(msgRef, {
      isDeleted:  true,
      text:       '',
      mediaURL:   null,
      deletedAt:  serverTimestamp()
    });
  } catch (err) {
    console.error('deleteMessage error:', err);
    throw new Error(err.message || 'Failed to delete message.');
  }
}

/**
 * Upload a media file and send it as a message.
 * @param {string} chatId
 * @param {string} senderId
 * @param {Object} senderData
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<Object>}
 */
export async function sendMediaMessage(chatId, senderId, senderData, file, onProgress) {
  try {
    const mediaURL = await uploadMedia(chatId, senderId, file, onProgress);
    const mediaType = file.type.startsWith('image/') ? 'image'
                    : file.type.startsWith('video/') ? 'video'
                    : file.type.startsWith('audio/') ? 'audio'
                    : 'file';
    return await sendMessage(chatId, senderId, senderData, null, mediaURL, mediaType);
  } catch (err) {
    console.error('sendMediaMessage error:', err);
    throw new Error('Failed to send media message.');
  }
}

// ---------------------------------------------------------------------------
// Typing status
// ---------------------------------------------------------------------------

/**
 * Set typing status in a chat.
 * @param {string} chatId
 * @param {string} uid
 * @param {boolean} isTyping
 * @returns {Promise<void>}
 */
export async function setTypingStatus(chatId, uid, isTyping) {
  try {
    await updateDoc(doc(getDB(), 'chats', chatId), {
      [`typingStatus.${uid}`]: isTyping
    });
  } catch (err) {
    // Non-critical — swallow silently
    console.warn('setTypingStatus error:', err);
  }
}

/**
 * Subscribe to typing status changes in a chat (excluding self).
 * @param {string} chatId
 * @param {string} uid - The current user's UID (excluded from result).
 * @param {Function} callback - Receives object { uid: boolean }
 * @returns {Function} Unsubscribe.
 */
export function subscribeToTyping(chatId, uid, callback) {
  const db = getDB();
  return onSnapshot(doc(db, 'chats', chatId), snap => {
    if (!snap.exists()) return;
    const typing = snap.data().typingStatus || {};
    const others = Object.fromEntries(
      Object.entries(typing).filter(([k]) => k !== uid)
    );
    callback(others);
  }, err => {
    console.warn('subscribeToTyping error:', err);
  });
}

// ---------------------------------------------------------------------------
// Chat info
// ---------------------------------------------------------------------------

/**
 * Get chat document enriched with the other participant's profile.
 * @param {string} chatId
 * @param {string} currentUid
 * @returns {Promise<Object|null>}
 */
export async function getChatInfo(chatId, currentUid) {
  try {
    const db = getDB();
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnap.exists()) return null;
    const chat = { id: chatSnap.id, ...chatSnap.data() };

    if (!chat.isGroup) {
      const otherUid = (chat.members || []).find(m => m !== currentUid);
      if (otherUid) {
        const userSnap = await getDoc(doc(db, 'users', otherUid));
        if (userSnap.exists()) chat.otherUser = { id: userSnap.id, ...userSnap.data() };
      }
    }

    return chat;
  } catch (err) {
    console.error('getChatInfo error:', err);
    throw new Error('Failed to load chat info.');
  }
}

// ---------------------------------------------------------------------------
// Search / Pin
// ---------------------------------------------------------------------------

/**
 * Search messages within a chat by text content.
 * @param {string} chatId
 * @param {string} queryStr
 * @returns {Promise<Object[]>}
 */
export async function searchMessages(chatId, queryStr) {
  try {
    const db = getDB();
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const lower = queryStr.toLowerCase();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => (m.text || '').toLowerCase().includes(lower));
  } catch (err) {
    console.error('searchMessages error:', err);
    throw new Error('Failed to search messages.');
  }
}

/**
 * Pin a message in a chat (members only).
 * @param {string} chatId
 * @param {string} messageId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function pinMessage(chatId, messageId, uid) {
  try {
    const db = getDB();
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnap.exists()) throw new Error('Chat not found.');
    if (!(chatSnap.data().members || []).includes(uid)) throw new Error('Unauthorized.');

    await updateDoc(doc(db, 'chats', chatId), { pinnedMessage: messageId });
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { isPinned: true });
  } catch (err) {
    console.error('pinMessage error:', err);
    throw new Error(err.message || 'Failed to pin message.');
  }
}

// ---------------------------------------------------------------------------
// Unread count
// ---------------------------------------------------------------------------

/**
 * Get total unread message count across all of a user's chats.
 * @param {string} uid
 * @returns {Promise<number>}
 */
export async function getUnreadCount(uid) {
  try {
    const chats = await getUserChats(uid);
    return chats.reduce((total, chat) => {
      return total + ((chat.unreadCounts || {})[uid] || 0);
    }, 0);
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Group management
// ---------------------------------------------------------------------------

/**
 * Add a member to a group chat (admin only).
 * @param {string} chatId
 * @param {string} uid - UID of user to add.
 * @param {string} adminUid
 * @returns {Promise<void>}
 */
export async function addGroupMember(chatId, uid, adminUid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'chats', chatId));
    if (!snap.exists()) throw new Error('Chat not found.');
    const chat = snap.data();
    if (!chat.isGroup) throw new Error('Not a group chat.');
    if (!(chat.adminUids || []).includes(adminUid)) throw new Error('Unauthorized.');

    await updateDoc(doc(db, 'chats', chatId), {
      members: arrayUnion(uid),
      [`unreadCounts.${uid}`]: 0
    });
  } catch (err) {
    console.error('addGroupMember error:', err);
    throw new Error(err.message || 'Failed to add member.');
  }
}

/**
 * Remove a member from a group chat (admin only).
 * @param {string} chatId
 * @param {string} uid - UID of user to remove.
 * @param {string} adminUid
 * @returns {Promise<void>}
 */
export async function removeGroupMember(chatId, uid, adminUid) {
  try {
    const db = getDB();
    const snap = await getDoc(doc(db, 'chats', chatId));
    if (!snap.exists()) throw new Error('Chat not found.');
    const chat = snap.data();
    if (!chat.isGroup) throw new Error('Not a group chat.');
    if (!(chat.adminUids || []).includes(adminUid)) throw new Error('Unauthorized.');

    await updateDoc(doc(db, 'chats', chatId), {
      members:   arrayRemove(uid),
      adminUids: arrayRemove(uid)
    });
  } catch (err) {
    console.error('removeGroupMember error:', err);
    throw new Error(err.message || 'Failed to remove member.');
  }
}
