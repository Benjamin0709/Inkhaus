import { createContext, useContext, useState, useCallback } from "react";

const LiveChatContext = createContext(null);

export function LiveChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState(null);

  // Abre el widget y, si se pasa un id, selecciona esa conversación de inmediato.
  const openLiveChat = useCallback((conversationId = null) => {
    setPendingConversationId(conversationId);
    setOpen(true);
  }, []);

  const closeLiveChat = useCallback(() => setOpen(false), []);

  return (
    <LiveChatContext.Provider value={{ open, setOpen, pendingConversationId, setPendingConversationId, openLiveChat, closeLiveChat }}>
      {children}
    </LiveChatContext.Provider>
  );
}

export const useLiveChat = () => useContext(LiveChatContext);