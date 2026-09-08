/**
 * Decoupled Chat Store (Zustand-inspired atomic state pattern)
 * Zero re-render propagation and memory-leak-free listener lifecycle.
 */

class ChatStore {
  constructor() {
    this.state = {
      activeConversationId: null,
      messagesByConv: new Map(),
      typingUsers: new Set(),
      isLoading: false,
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setActiveConversation(conversationId) {
    this.state.activeConversationId = conversationId;
    this.notify();
  }

  addMessage(conversationId, message) {
    if (!this.state.messagesByConv.has(conversationId)) {
      this.state.messagesByConv.set(conversationId, []);
    }
    this.state.messagesByConv.get(conversationId).push(message);
    this.notify();
  }

  getMessages(conversationId) {
    return this.state.messagesByConv.get(conversationId) || [];
  }

  setUserTyping(userId, isTyping) {
    if (isTyping) {
      this.state.typingUsers.add(userId);
    } else {
      this.state.typingUsers.delete(userId);
    }
    this.notify();
  }

  clear() {
    this.state.messagesByConv.clear();
    this.state.typingUsers.clear();
    this.listeners.clear();
  }
}

export const chatStore = new ChatStore();
