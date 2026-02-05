"use client";

import { useEffect } from "react";
import { useAppStore, type ApiMessage } from "@/store/useAppStore";
import { disconnectSocket, getSocket } from "@/lib/socket";

export default function SocketBridge() {
  const authToken = useAppStore((state) => state.authToken);
  const receiveMessage = useAppStore((state) => state.receiveMessage);
  const receiveTyping = useAppStore((state) => state.receiveTyping);

  useEffect(() => {
    if (!authToken) {
      disconnectSocket();
      return;
    }

    const socket = getSocket(authToken);
    if (!socket) return;

    const handleMessage = (message: ApiMessage) => {
      receiveMessage(message);
    };
    const handleTyping = (payload: { matchId?: string; senderId?: string; isTyping?: boolean }) => {
      if (!payload?.matchId || !payload?.senderId) return;
      receiveTyping(payload.matchId, payload.senderId, Boolean(payload.isTyping));
    };

    socket.on("conversation:update", handleMessage);
    socket.on("message", handleMessage);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("conversation:update", handleMessage);
      socket.off("message", handleMessage);
      socket.off("typing", handleTyping);
    };
  }, [authToken, receiveMessage, receiveTyping]);

  return null;
}
