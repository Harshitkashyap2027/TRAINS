// Custom event emitter / event bus for cross-component communication
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) this.listeners.delete(event);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) callbacks.forEach(cb => {
      try { cb(data); } catch(e) { console.error(`EventBus error on "${event}":`, e); }
    });
  }

  once(event, callback) {
    const wrapper = (data) => { callback(data); this.off(event, wrapper); };
    this.on(event, wrapper);
  }

  clear(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();

// Event constants
export const EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_UPDATED: 'user:updated',
  POST_CREATED: 'post:created',
  POST_DELETED: 'post:deleted',
  POST_LIKED: 'post:liked',
  COMMENT_ADDED: 'comment:added',
  STORY_VIEWED: 'story:viewed',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  CHAT_MESSAGE: 'chat:message',
  CALL_INCOMING: 'call:incoming',
  CALL_ENDED: 'call:ended',
  THEME_CHANGED: 'theme:changed',
  ROUTE_CHANGED: 'route:changed',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  FOLLOW_CHANGED: 'follow:changed',
  PROJECT_STARRED: 'project:starred',
};
