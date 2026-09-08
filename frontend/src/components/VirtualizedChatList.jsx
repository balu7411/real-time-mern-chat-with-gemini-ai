import React, { useRef, useState, useEffect, useMemo } from "react";

/**
 * VirtualizedChatList
 * Enforces Memory Leak Eradication Protocol (Section 1.3):
 * Keeps DOM node count strictly constant (~30 nodes) even with 100,000+ messages.
 */
export default function VirtualizedChatList({
  messages = [],
  currentUserId = "",
  itemHeight = 64,
  overscan = 5,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight || 600);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = messages.length * itemHeight;

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(messages.length, start + visibleCount + 2 * overscan);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, itemHeight, messages.length, overscan]);

  const visibleMessages = useMemo(() => {
    return messages.slice(startIndex, endIndex).map((msg, index) => ({
      ...msg,
      virtualIndex: startIndex + index,
      offsetTop: (startIndex + index) * itemHeight,
    }));
  }, [messages, startIndex, endIndex, itemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-testid="virtualized-chat-container"
      className="h-full w-full overflow-y-auto relative scroll-smooth px-4 py-2"
      style={{ willChange: "transform" }}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative", width: "100%" }}>
        {visibleMessages.map((msg) => {
          const isMe = msg.senderId === currentUserId || msg.sender?._id === currentUserId;
          const isAI = msg.type === "ai" || msg.isAI;

          return (
            <div
              key={msg.id || msg._id || msg.virtualIndex}
              data-testid="virtual-chat-node"
              style={{
                position: "absolute",
                top: `${msg.offsetTop}px`,
                left: 0,
                right: 0,
                height: `${itemHeight}px`,
              }}
              className={`flex items-center ${isMe ? "justify-end" : "justify-start"} px-2`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm transition-all shadow-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-xs"
                    : isAI
                    ? "bg-purple-950/80 border border-purple-500/30 text-purple-100 rounded-bl-xs"
                    : "glass-card text-gray-200 rounded-bl-xs"
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5 text-xs opacity-75">
                  <span className="font-semibold">{isAI ? "🤖 Gemini AI" : msg.senderName || "User"}</span>
                  <span className="text-[10px]">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
                <div className="truncate">{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
