/**
 * AETHER – Reactive State Store
 * Centralised singleton store with granular subscription support.
 */

class Store {
  constructor(initialState) {
    this._state = { ...initialState };
    // Map of key -> Set<callback>
    this._subscribers = new Map();
    // Set of callbacks subscribed to ALL state changes
    this._globalSubscribers = new Set();
  }

  /**
   * Return a shallow copy of the current state.
   * @returns {object}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Merge partial state into the current state and notify subscribers.
   * @param {Partial<typeof initialState>} partial
   */
  setState(partial) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(partial)) {
      if (this._state[key] !== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length === 0) return;

    // Notify key-specific subscribers
    for (const key of changedKeys) {
      const keySubscribers = this._subscribers.get(key);
      if (keySubscribers) {
        for (const cb of keySubscribers) {
          try { cb(this._state[key], this._state); }
          catch (e) { console.error(`Store subscriber error for key "${key}":`, e); }
        }
      }
    }

    // Notify global subscribers
    const snapshot = this.getState();
    for (const cb of this._globalSubscribers) {
      try { cb(snapshot, changedKeys); }
      catch (e) { console.error('Store global subscriber error:', e); }
    }
  }

  /**
   * Subscribe to changes on a specific state key.
   * @param {string} key
   * @param {(value: any, state: object) => void} callback
   * @returns {() => void}  Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);
    return () => {
      const set = this._subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this._subscribers.delete(key);
      }
    };
  }

  /**
   * Subscribe to all state changes.
   * @param {(state: object, changedKeys: string[]) => void} callback
   * @returns {() => void}  Unsubscribe function
   */
  subscribeAll(callback) {
    this._globalSubscribers.add(callback);
    return () => this._globalSubscribers.delete(callback);
  }

  // ─── Domain-specific helpers ───────────────────────────────────────────────

  /**
   * Set the authenticated user and flip isAuthenticated flag.
   * @param {object} user
   */
  setUser(user) {
    this.setState({ user, isAuthenticated: true, isLoading: false });
  }

  /**
   * Clear the user session and reset auth state.
   */
  clearUser() {
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      adminMode: false,
      notifications: [],
      unreadCount: 0,
      unreadMessages: 0,
      onlineUsers: new Set(),
    });
  }

  /**
   * Set the active theme and persist to localStorage.
   * @param {'dark'|'light'|'system'} theme
   */
  setTheme(theme) {
    this.setState({ theme });
    localStorage.setItem('aether-theme', theme);
  }

  /**
   * Prepend a notification to the notifications list and increment unread count.
   * @param {object} notif  Notification document
   */
  addNotification(notif) {
    const notifications = [notif, ...this._state.notifications].slice(0, 100);
    const unreadCount = notifications.filter((n) => !n.read).length;
    this.setState({ notifications, unreadCount });
  }

  /**
   * Mark all current notifications as read and reset the unread badge.
   */
  markNotificationsRead() {
    const notifications = this._state.notifications.map((n) => ({ ...n, read: true }));
    this.setState({ notifications, unreadCount: 0 });
  }

  /**
   * Set the unread notifications count directly (e.g. from a Firestore listener).
   * @param {number} n
   */
  setUnreadCount(n) {
    this.setState({ unreadCount: Math.max(0, n) });
  }

  /**
   * Set the unread messages count.
   * @param {number} n
   */
  setUnreadMessages(n) {
    this.setState({ unreadMessages: Math.max(0, n) });
  }

  /**
   * Add or remove a user UID from the online users Set.
   * @param {string} uid
   * @param {boolean} isOnline
   */
  toggleOnlineUser(uid, isOnline) {
    const onlineUsers = new Set(this._state.onlineUsers);
    if (isOnline) onlineUsers.add(uid);
    else onlineUsers.delete(uid);
    this.setState({ onlineUsers });
  }

  /**
   * Toggle admin mode (only available to admin users).
   * @param {boolean} bool
   */
  setAdminMode(bool) {
    const { user } = this._state;
    if (!user || user.role !== 'admin') {
      console.warn('setAdminMode: current user is not an admin.');
      return;
    }
    this.setState({ adminMode: bool });
  }
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  theme: 'dark',
  notifications: [],
  unreadCount: 0,
  unreadMessages: 0,
  onlineUsers: new Set(),
  currentRoute: null,
  adminMode: false,
};

export const store = new Store(initialState);
