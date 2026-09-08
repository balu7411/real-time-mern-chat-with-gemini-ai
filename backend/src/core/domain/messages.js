/**
 * Polymorphic Message Hierarchy adhering to Liskov Substitution Principle (LSP)
 * Controllers and Socket handlers treat all subtypes interchangeably.
 */

class BaseMessage {
  constructor({ id, conversationId, text, senderId, senderName, createdAt = new Date() }) {
    if (new.target === BaseMessage) {
      throw new TypeError("Cannot construct BaseMessage instances directly; use polymorphic subtypes");
    }
    this.id = id;
    this.conversationId = conversationId;
    this.text = text;
    this.senderId = senderId;
    this.senderName = senderName;
    this.createdAt = createdAt;
  }

  getType() {
    throw new Error("Method 'getType()' must be implemented by subtype.");
  }

  format() {
    return {
      id: this.id,
      conversationId: this.conversationId,
      text: this.text,
      senderId: this.senderId,
      senderName: this.senderName,
      type: this.getType(),
      createdAt: this.createdAt,
    };
  }
}

class UserMessage extends BaseMessage {
  constructor(params) {
    super(params);
  }

  getType() {
    return "user";
  }
}

class AIMessage extends BaseMessage {
  constructor({ tokensGenerated = 0, model = "gemini-1.5-flash", ...params }) {
    super(params);
    this.tokensGenerated = tokensGenerated;
    this.model = model;
  }

  getType() {
    return "ai";
  }

  format() {
    return {
      ...super.format(),
      tokensGenerated: this.tokensGenerated,
      model: this.model,
    };
  }
}

class SystemEventMessage extends BaseMessage {
  constructor({ eventType, ...params }) {
    super(params);
    this.eventType = eventType;
  }

  getType() {
    return "system";
  }

  format() {
    return {
      ...super.format(),
      eventType: this.eventType,
    };
  }
}

module.exports = {
  BaseMessage,
  UserMessage,
  AIMessage,
  SystemEventMessage,
};
