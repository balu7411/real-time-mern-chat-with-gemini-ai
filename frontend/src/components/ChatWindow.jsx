import React, { useEffect, useRef, useState } from "react";

export default function ChatWindow({ messages, currentUserId, onSend, aiThinking }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m._id} message={m} isOwn={m.sender === currentUserId} />
        ))}
        {aiThinking && (
          <div className="text-xs text-gray-500 italic px-1">Gemini AI is thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-panel2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter message · start with @ai to ask Gemini"
          className="flex-1 bg-panel2 text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-sm"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-blue-600 transition text-white px-4 rounded-md text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isOwn }) {
  if (message.isAI) {
    return (
      <div className="max-w-[85%]">
        <div className="text-xs text-accent font-semibold mb-1">AI</div>
        <div className="bg-panel2 border border-accent/30 text-gray-100 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
          {message.text}
          {message.fileRefs?.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Updated files: {message.fileRefs.join(", ")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-[85%] ${isOwn ? "ml-auto text-right" : ""}`}>
      <div className="text-xs text-gray-500 mb-1">{message.senderName}</div>
      <div
        className={`inline-block rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isOwn ? "bg-accent text-white" : "bg-panel2 text-gray-100"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
