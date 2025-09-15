package backend

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/gorilla/websocket"
)

type wsClients struct {
	sync.RWMutex
	m map[int][]*websocket.Conn
}

// WebSocket handler
func (S *Server) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, ok := S.CheckSession(r) // user authentication
	if ok != nil {
		fmt.Println("Session not found", ok)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	S.initWebSocket()
	conn, err := S.upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error upgrading connection", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	S.wsClients.Lock()
	S.wsClients.m[userID] = append(S.wsClients.m[userID], conn)
	S.wsClients.Unlock()

	fmt.Println("User", userID, "connected to WebSocket")
	go func() {
		defer func() {
			conn.Close()
			S.wsClients.Lock()
			conns := S.wsClients.m[userID]
			for i, c := range conns {
				if c == conn {
					fmt.Println("User", userID, "disconnected from WebSocket")
					S.wsClients.m[userID] = append(conns[:i], conns[i+1:]...)
					break
				}
			}
			S.wsClients.Unlock()
		}()

		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				break
			}

			switch msg["type"] {
			case "chat":
				targetID, _ := strconv.Atoi(msg["to"].(string))
				S.PushMessage(targetID, msg)
			case "notification":
				targetID, _ := strconv.Atoi(msg["to"].(string))
				S.PushNotification(targetID, msg)
			}
		}
	}()
}

func (S *Server) PushNotification(userID int, notif interface{}) {
	S.wsClients.RLock()
	defer S.wsClients.RUnlock()
	for _, conn := range S.wsClients.m[userID] {
		conn.WriteJSON(notif)
	}
}

func (S *Server) PushMessage(userID int, msg interface{}) {
	S.wsClients.RLock()
	defer S.wsClients.RUnlock()
	for _, conn := range S.wsClients.m[userID] {
		conn.WriteJSON(msg)
	}
}

func (S *Server) BroadcastMessage(msg interface{}) {
	S.wsClients.RLock()
	defer S.wsClients.RUnlock()
	for _, conns := range S.wsClients.m {
		for _, conn := range conns {
			conn.WriteJSON(msg)
		}
	}
}
