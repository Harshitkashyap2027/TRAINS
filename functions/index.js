/**
 * AETHER – Firebase Cloud Functions
 * Production-ready backend triggers and callable functions.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a push notification via Firebase Cloud Messaging.
 * Silently ignores users without a registered FCM token.
 *
 * @param {string} recipientUid
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendPushNotification(recipientUid, payload) {
  try {
    const userDoc = await db.collection('users').doc(recipientUid).get();
    if (!userDoc.exists) return;

    const { fcmToken } = userDoc.data();
    if (!fcmToken) return;

    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data
        ? Object.fromEntries(
            Object.entries(payload.data).map(([k, v]) => [k, String(v)]),
          )
        : {},
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
      android: {
        notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
      },
    };

    await messaging.send(message);
    functions.logger.info(`Push sent to user ${recipientUid}`);
  } catch (err) {
    // Log but do not throw – push failures should never break the triggering write.
    functions.logger.warn(`Failed to send push to ${recipientUid}:`, err.message);
  }
}

/**
 * Write a notification document to Firestore and fire a push.
 *
 * @param {string} recipientId
 * @param {object} notifData
 */
async function createNotification(recipientId, notifData) {
  const notification = {
    recipientId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...notifData,
  };

  await db.collection('notifications').add(notification);
  await sendPushNotification(recipientId, {
    title: notifData.title || 'AETHER',
    body: notifData.body || 'You have a new notification.',
    data: { type: notifData.type || 'generic', recipientId },
  });
}

/**
 * Batch-update user stats (followerCount, followingCount, postCount).
 * Uses a transaction to avoid races.
 *
 * @param {string} uid
 * @param {object} deltas  e.g. { followerCount: 1, postCount: -1 }
 */
async function updateUserStats(uid, deltas) {
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(userRef);
    if (!snap.exists) return;
    const updates = {};
    for (const [key, delta] of Object.entries(deltas)) {
      const current = snap.data()[key] || 0;
      updates[key] = Math.max(0, current + delta);
    }
    txn.update(userRef, updates);
  });
}

// ─── Auth Triggers ────────────────────────────────────────────────────────────

/**
 * onUserCreated – Create a Firestore profile document when a new user registers.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  const defaultUsername = (displayName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);

  const profile = {
    uid,
    email,
    displayName: displayName || defaultUsername,
    username: defaultUsername,
    photoURL: photoURL || null,
    bio: '',
    skills: [],
    interests: [],
    followers: [],
    following: [],
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    projectCount: 0,
    isPrivate: false,
    role: 'user',
    onboardingComplete: false,
    fcmToken: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection('users').doc(uid).set(profile);
    functions.logger.info(`Created profile for user ${uid}`);
  } catch (err) {
    functions.logger.error(`Failed to create profile for user ${uid}:`, err);
  }
});

/**
 * onUserDeleted – Clean up user data when an account is deleted.
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;

  try {
    const batch = db.batch();

    // Delete user profile
    batch.delete(db.collection('users').doc(uid));

    // Delete their posts
    const postsSnap = await db.collection('posts').where('authorId', '==', uid).get();
    postsSnap.forEach((doc) => batch.delete(doc.ref));

    // Delete their stories
    const storiesSnap = await db.collection('stories').where('authorId', '==', uid).get();
    storiesSnap.forEach((doc) => batch.delete(doc.ref));

    // Delete their projects
    const projectsSnap = await db.collection('projects').where('authorId', '==', uid).get();
    projectsSnap.forEach((doc) => batch.delete(doc.ref));

    // Delete notifications addressed to them
    const notifsSnap = await db.collection('notifications').where('recipientId', '==', uid).get();
    notifsSnap.forEach((doc) => batch.delete(doc.ref));

    // Delete follow documents where they are the follower
    const followsSnap = await db.collection('follows').where('followerId', '==', uid).get();
    followsSnap.forEach((doc) => batch.delete(doc.ref));

    // Delete follow documents where they are the followed
    const followedSnap = await db.collection('follows').where('followedId', '==', uid).get();
    followedSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    functions.logger.info(`Cleaned up data for deleted user ${uid}`);
  } catch (err) {
    functions.logger.error(`Failed to clean up data for user ${uid}:`, err);
  }
});

// ─── Firestore Triggers ───────────────────────────────────────────────────────

/**
 * onPostCreated – Notify followers when a user creates a new post.
 */
exports.onPostCreated = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const { postId } = context.params;

    // Increment author's postCount
    await updateUserStats(post.authorId, { postCount: 1 });

    // Fetch author info
    const authorDoc = await db.collection('users').doc(post.authorId).get();
    if (!authorDoc.exists) return;
    const author = authorDoc.data();

    // Notify each follower (cap at 500 to avoid runaway function costs)
    const followsSnap = await db
      .collection('follows')
      .where('followedId', '==', post.authorId)
      .limit(500)
      .get();

    const notifPromises = followsSnap.docs.map((doc) => {
      const { followerId } = doc.data();
      if (followerId === post.authorId) return null; // skip self
      return createNotification(followerId, {
        type: 'new_post',
        title: `${author.displayName} posted`,
        body: post.content ? post.content.slice(0, 80) : 'Check out their new post!',
        actorId: post.authorId,
        actorName: author.displayName,
        actorAvatar: author.photoURL || null,
        postId,
      });
    });

    await Promise.allSettled(notifPromises.filter(Boolean));
    functions.logger.info(`Notified followers of new post ${postId}`);
  });

/**
 * onPostDeleted – Decrement the author's postCount when a post is deleted.
 */
exports.onPostDeleted = functions.firestore
  .document('posts/{postId}')
  .onDelete(async (snap) => {
    const post = snap.data();
    await updateUserStats(post.authorId, { postCount: -1 });
  });

/**
 * onFollowCreated – Notify user B when user A follows them and update counts.
 */
exports.onFollowCreated = functions.firestore
  .document('follows/{followId}')
  .onCreate(async (snap) => {
    const { followerId, followedId } = snap.data();

    // Update counts
    await Promise.all([
      updateUserStats(followerId, { followingCount: 1 }),
      updateUserStats(followedId, { followerCount: 1 }),
    ]);

    // Fetch follower info for the notification
    const followerDoc = await db.collection('users').doc(followerId).get();
    if (!followerDoc.exists) return;
    const follower = followerDoc.data();

    await createNotification(followedId, {
      type: 'new_follower',
      title: 'New follower',
      body: `${follower.displayName} started following you.`,
      actorId: followerId,
      actorName: follower.displayName,
      actorAvatar: follower.photoURL || null,
    });

    functions.logger.info(`Follow: ${followerId} → ${followedId}`);
  });

/**
 * onFollowDeleted – Decrement follower/following counts when unfollowed.
 */
exports.onFollowDeleted = functions.firestore
  .document('follows/{followId}')
  .onDelete(async (snap) => {
    const { followerId, followedId } = snap.data();
    await Promise.all([
      updateUserStats(followerId, { followingCount: -1 }),
      updateUserStats(followedId, { followerCount: -1 }),
    ]);
  });

/**
 * onCommentCreated – Notify the post owner when someone comments.
 */
exports.onCommentCreated = functions.firestore
  .document('posts/{postId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const { postId } = context.params;

    // Fetch the parent post
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) return;
    const post = postDoc.data();

    // Don't notify if the author comments on their own post
    if (comment.authorId === post.authorId) return;

    // Fetch commenter info
    const commenterDoc = await db.collection('users').doc(comment.authorId).get();
    if (!commenterDoc.exists) return;
    const commenter = commenterDoc.data();

    await createNotification(post.authorId, {
      type: 'new_comment',
      title: `${commenter.displayName} commented`,
      body: comment.text ? comment.text.slice(0, 80) : 'on your post.',
      actorId: comment.authorId,
      actorName: commenter.displayName,
      actorAvatar: commenter.photoURL || null,
      postId,
    });

    functions.logger.info(`Comment notification sent for post ${postId}`);
  });

/**
 * onLikeCreated – Notify the post owner when someone likes their post.
 */
exports.onLikeCreated = functions.firestore
  .document('posts/{postId}/likes/{likerId}')
  .onCreate(async (snap, context) => {
    const { postId, likerId } = context.params;

    // Fetch the parent post
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) return;
    const post = postDoc.data();

    // Don't notify on self-like
    if (likerId === post.authorId) return;

    // Increment like count on the post document
    await db.collection('posts').doc(postId).update({
      likeCount: admin.firestore.FieldValue.increment(1),
    });

    // Fetch liker info
    const likerDoc = await db.collection('users').doc(likerId).get();
    if (!likerDoc.exists) return;
    const liker = likerDoc.data();

    await createNotification(post.authorId, {
      type: 'new_like',
      title: `${liker.displayName} liked your post`,
      body: post.content ? post.content.slice(0, 60) : 'Check it out!',
      actorId: likerId,
      actorName: liker.displayName,
      actorAvatar: liker.photoURL || null,
      postId,
    });

    functions.logger.info(`Like notification sent for post ${postId}`);
  });

/**
 * onLikeDeleted – Decrement the like count when a like is removed.
 */
exports.onLikeDeleted = functions.firestore
  .document('posts/{postId}/likes/{likerId}')
  .onDelete(async (_, context) => {
    const { postId } = context.params;
    await db.collection('posts').doc(postId).update({
      likeCount: admin.firestore.FieldValue.increment(-1),
    });
  });

// ─── Scheduled Functions ──────────────────────────────────────────────────────

/**
 * cleanupExpiredStories – Delete stories older than 24 hours.
 * Runs every hour.
 */
exports.cleanupExpiredStories = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredSnap = await db
      .collection('stories')
      .where('createdAt', '<', cutoff)
      .get();

    if (expiredSnap.empty) {
      functions.logger.info('No expired stories to clean up.');
      return;
    }

    // Batch deletes (Firestore limit: 500 per batch)
    const batchSize = 500;
    const docs = expiredSnap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    functions.logger.info(`Deleted ${docs.length} expired stories.`);
  });

// ─── Callable Functions ───────────────────────────────────────────────────────

/**
 * generateUsernameAvailability – Check whether a username is taken in Firestore.
 * @callable
 * @param {{ username: string }} data
 * @returns {{ available: boolean, username: string }}
 */
exports.generateUsernameAvailability = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { username } = data;

  if (!username || typeof username !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Username is required.');
  }

  const normalised = username.trim().toLowerCase();

  if (normalised.length < 3 || normalised.length > 20) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Username must be between 3 and 20 characters.',
    );
  }

  if (!/^[a-z0-9_]+$/.test(normalised)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Username may only contain letters, numbers, and underscores.',
    );
  }

  // Reserved usernames – loaded from Firestore config for hot-update without
  // redeployment, with a hardcoded fallback list for safety.
  const FALLBACK_RESERVED = [
    'admin', 'aether', 'support', 'help', 'api', 'www', 'mail', 'root',
    'system', 'official', 'moderator', 'staff', 'security', 'abuse',
  ];

  let reserved = FALLBACK_RESERVED;
  try {
    const configDoc = await db.collection('config').doc('reservedUsernames').get();
    if (configDoc.exists && Array.isArray(configDoc.data().list)) {
      reserved = configDoc.data().list;
    }
  } catch (configErr) {
    functions.logger.warn('Could not load reserved usernames from config, using fallback:', configErr.message);
  }

  if (reserved.includes(normalised)) {
    return { available: false, username: normalised };
  }

  const snap = await db
    .collection('users')
    .where('username', '==', normalised)
    .limit(1)
    .get();

  return { available: snap.empty, username: normalised };
});
