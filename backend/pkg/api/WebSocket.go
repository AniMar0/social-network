package backend

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
	"github.com/twinj/uuid"
)

type Client struct {
	ID        string           `json:"id"`
	Conn      *websocket.Conn  `json:"-"`
	Send      chan interface{} `json:"-"`
	UserID    int              `json:"user_id"`
	SessionID string           `json:"session_id"`
}

func (S *Server) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	userID, SessionID, ok := S.CheckSession(r)
	if ok != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	S.initWebSocket()
	conn, err := S.upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	client := &Client{
		ID:        uuid.NewV4().String(),
		Conn:      conn,
		UserID:    userID,
		SessionID: SessionID,
		Send:      make(chan interface{}, 10),
	}

	// add client
	S.Lock()
	if S.Users[userID] == nil {
		S.Users[userID] = []*Client{}
	}
	S.Users[userID] = append(S.Users[userID], client)
	S.Unlock()

	// start writer
	go S.StartWriter(client)

	// start reader
	go S.StartReader(client)
}

func (S *Server) StartReader(client *Client) {
	defer func() {
		client.Conn.Close()
		S.Lock()
		conns := S.Users[client.UserID]
		for i, c := range conns {
			if c == client {
				S.Users[client.UserID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		S.Unlock()
	}()

	for {
		var msg map[string]interface{}
		if err := client.Conn.ReadJSON(&msg); err != nil {
			return
		}
		fmt.Println("Received message:", msg)
		// unified channel switch
		switch msg["channel"] {
		case "chat":
			targetID, _ := strconv.Atoi(msg["to"].(string))
			S.PushMessage(targetID, msg)
		case "notifications":
			fmt.Println("Received notification:", msg)
			targetID, _ := strconv.Atoi(msg["to"].(string))
			S.PushNotification(targetID, msg)
		}
	}
}

func (S *Server) StartWriter(c *Client) {
	defer func() {
		c.Conn.Close()
		close(c.Send)
	}()

	for msg := range c.Send {
		if err := c.Conn.WriteJSON(msg); err != nil {
			fmt.Println("Error writing to client:", err)
			return
		}
	}
}

func (S *Server) PushNotification(userID int, notif interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		fmt.Println("Sending notification to user", userID)
		Session.Send <- map[string]interface{}{
			"channel": "notifications",
			"to":      userID,
			"payload": notif,
		}
	}
}

func (S *Server) PushMessage(userID int, msg interface{}) {
	S.RLock()
	defer S.RUnlock()
	for _, Session := range S.Users[userID] {
		Session.Send <- map[string]interface{}{
			"channel": "chat",
			"payload": msg,
		}
	}
}
