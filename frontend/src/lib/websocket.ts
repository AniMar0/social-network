"use client";

import { triggerNotificationUpdate } from "@/lib/notifications";
let ws: WebSocket | null = null;

export function initWebSocket(userId: number) {
  if (ws) return ws;

  ws = new WebSocket("ws://localhost:8080/ws");

  ws.onopen = () => console.log("WebSocket connected for user", userId);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.channel === "notifications") {
      triggerNotificationUpdate();
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed for user", userId);
    ws = null;
  };

  return ws;
}

export const getWebSocket = () => ws;

export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};
