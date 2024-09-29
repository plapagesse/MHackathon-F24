// src/hooks/useWebSocket.js
import { useEffect, useRef } from "react";

/**
 * Custom React hook to manage WebSocket connections.
 *
 * @param {string} lobbyId - The unique identifier for the lobby.
 * @param {string} userId - The unique identifier for the user.
 * @param {function} onMessageReceived - Callback function to handle incoming messages.
 *
 * @returns {function} sendMessage - Function to send messages through the WebSocket.
 */
function useWebSocket(lobbyId, userId, onMessageReceived) {
  const ws = useRef(null);
  const messageHandlerRef = useRef(onMessageReceived);

  useEffect(() => {
    messageHandlerRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!lobbyId || !userId) return;

    // Determine the WebSocket protocol
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/${lobbyId}?user_id=${userId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.current.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      if (messageHandlerRef.current) {
        messageHandlerRef.current(event.data);
      }
    };

    ws.current.onclose = (event) => {
      console.log(
        `WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`
      );
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [lobbyId, userId]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.error(
        "WebSocket is not open. Ready state:",
        ws.current.readyState
      );
    }
  };

  return sendMessage;
}

export default useWebSocket;
