package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/twinj/uuid"
)

func (S *Server) GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	chats, err := S.GetUsers(w, currentUserID)
	if err != nil {
		fmt.Println("Get Users Error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

func (S *Server) GetUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	chatid := r.URL.Path[len("/api/get-users/profile/"):]

	userData, err := S.GetUserData("", S.GetOtherUserID(currentUserID, tools.StringToInt(chatid)))
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userData)
}

func (S *Server) MakeChatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}
	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	otherUserID := r.URL.Path[len("/api/make-message/"):]

	if !S.FoundChat(currentUserID, tools.StringToInt(otherUserID)) {
		S.MakeChat(currentUserID, tools.StringToInt(otherUserID))
	}

	chatId := S.GetChatID(currentUserID, tools.StringToInt(otherUserID))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatId)
}

func (S *Server) MakeChat(currentUserID, otherUserID int) {
	query := `INSERT INTO chats (user1_id, user2_id) VALUES (?, ?)`
	_, err := S.db.Exec(query, currentUserID, otherUserID)
	if err != nil {
		fmt.Println(err)
	}
}

func (S *Server) FoundChat(currentUserID, otherUserID int) bool {
	query := `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
	var id int
	err := S.db.QueryRow(query, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false
		}
		fmt.Println("FoundChat", err)
		return false
	}
	return true
}

func (S *Server) SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	ChatID := r.URL.Path[len("/api/send-message/"):]
	currentUserID, SessionID, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var message Message
	err = json.NewDecoder(r.Body).Decode(&message)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	message.ChatID = tools.StringToInt(ChatID)

	S.SendMessage(currentUserID, message)

	resiverID := S.GetOtherUserID(currentUserID, message.ChatID)
	ID, _ := S.GetLastMessageID(ChatID)
	message.ID = tools.IntToString(ID)
	message.SenderID = currentUserID

	if len(S.Users[currentUserID]) > 1 {
		message.IsOwn = true
		S.PushMessage(SessionID, currentUserID, message)
	}

	message.IsOwn = false

	S.PushMessage("", resiverID, message)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(true)
}

func (S *Server) SendMessage(currentUserID int, message Message) error {
	query := `INSERT INTO messages (sender_id, chat_id, content, is_read, type) VALUES (?, ?, ? , ?, ?)`
	_, err := S.db.Exec(query, currentUserID, message.ChatID, message.Content, message.IsRead, message.Type)
	if err != nil {
		fmt.Println(err)
		return err
	}
	return nil
}

func (S *Server) GetMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	chatID := r.URL.Path[len("/api/get-messages/"):]
	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	messages, err := S.GetMessages(currentUserID, chatID)
	if err != nil {
		fmt.Println("Get Messages", err)
		tools.RenderErrorPage(w, r, "Messages Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (S *Server) GetMessages(currentUserID int, chatID string) ([]Message, error) {
	var messages []Message
	query := `SELECT id, sender_id, content, is_read, type, read_at FROM messages WHERE chat_id = ?`
	rows, err := S.db.Query(query, chatID)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var message Message
		err = rows.Scan(&message.ID, &message.SenderID, &message.Content, &message.IsRead, &message.Type, &message.Timestamp)
		if err != nil {
			fmt.Println(err)
			return nil, err
		}
		message.IsOwn = message.SenderID == currentUserID
		messages = append(messages, message)
	}
	return messages, nil
}

func (S *Server) GetChatID(currentUserID, otherUserID int) int {
	query := `SELECT id FROM chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`
	var id int
	err := S.db.QueryRow(query, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&id)
	if err != nil {
		fmt.Println(err)
		return 0
	}
	return id
}

func (S *Server) GetAllChatIDs(currentUserID int) ([]int, error) {
	query := `SELECT id FROM chats WHERE user1_id = ? OR user2_id = ?`
	rows, err := S.db.Query(query, currentUserID, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (S *Server) GetOtherUserID(currentUserID, chatID int) int {
	query := `SELECT user1_id, user2_id FROM chats WHERE id = ?`
	var user1_id, user2_id int
	err := S.db.QueryRow(query, chatID).Scan(&user1_id, &user2_id)
	if err != nil {
		fmt.Println(err)
		return 0
	}
	if user1_id == currentUserID {
		return user2_id
	}
	return user1_id
}

func (S *Server) GetUsers(w http.ResponseWriter, currentUserID int) ([]Chat, error) {
	chatIDs, err := S.GetAllChatIDs(currentUserID)
	if err != nil {
		return nil, err
	}
	var chats []Chat
	for _, chatID := range chatIDs {
		//otherUserID := S.GetOtherUserID(currentUserID, chatID)
		rows, err := S.db.Query(`
        SELECT 
			u.id,
    		u.first_name || ' ' || u.last_name AS name,
    		u.nickname,
    		u.avatar,
    		m.sender_id,
    		m.created_at AS timestamp,
			m.content AS last_message,
			m.type AS lastMessageType,
    	(
        SELECT COUNT(*) 
		FROM messages 
		WHERE chat_id = c.id 
			AND is_read = 0 
			AND sender_id != ?
    	) AS unread_count
		FROM chats c
		JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id) AND u.id != ?
		LEFT JOIN messages m ON m.id = (
		SELECT id 
    	FROM messages 
		WHERE chat_id = c.id 
    	ORDER BY created_at DESC 
    	LIMIT 1
		)
		WHERE c.id = ?;

    `, currentUserID, currentUserID, chatID, chatID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			var c Chat
			var lastMessage sql.NullString
			var timestamp sql.NullString
			var nickname sql.NullString
			var senderID sql.NullString
			var lastMessageType sql.NullString
			if err := rows.Scan(
				&c.ID,
				&c.Name,
				&nickname,
				&c.Avatar,
				&senderID,
				&timestamp,
				&lastMessage,
				&lastMessageType,
				&c.UnreadCount,
			); err != nil {
				return nil, err
			}
			connections := S.GetConnections(tools.StringToInt(c.ID))

			if len(connections) > 0 {
				online := true
				c.IsOnline = &online
			}

			c.UserID = currentUserID
			c.ID = tools.IntToString(chatID)

			if nickname.Valid {
				c.Username = nickname.String
			} else {
				c.Username = ""
			}

			if senderID.Valid {
				c.SenderID = tools.StringToInt(senderID.String)
			}

			if lastMessage.Valid {
				c.LastMessage = lastMessage.String
			} else {
				c.LastMessage = ""
			}

			if lastMessageType.Valid {
				c.LastMessageType = lastMessageType.String
			}

			if timestamp.Valid {
				c.Timestamp = timestamp.String
			} else {
				c.Timestamp = ""
			}

			chats = append(chats, c)
		}
	}
	return chats, nil
}

func (S *Server) UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Upload File Handler")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		fmt.Println("Failed to read post", err)
		http.Error(w, "Cannot read post", http.StatusBadRequest)
		return
	}
	defer file.Close()
	messagePath := "uploads/Messages/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(messagePath)
	if err != nil {
		fmt.Println("Failed to save post 1", err)
		http.Error(w, "Cannot save post", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		fmt.Println("Failed to save post 2", err)
		http.Error(w, "Failed to save post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"messageImageUrl": "/%s"}`, messagePath)))
}

func (S *Server) SeenMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	chatID := r.URL.Path[len("/api/set-seen-chat/"):]
	if chatID == "chats" {
		w.WriteHeader(http.StatusOK)
		return
	}
	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	err = S.SeenMessage(chatID, currentUserID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	userId := S.GetOtherUserID(currentUserID, tools.StringToInt(chatID))
	GetLastMessage, _ := S.GetLastMessageID(chatID)

	S.PushMessageSeen(userId, map[string]interface{}{
		"message_id": GetLastMessage,
		"chat_id":    chatID,
	})
	w.WriteHeader(http.StatusOK)
}
func (S *Server) SeenMessage(chatID string, userID int) error {
	// if last message is seen return
	_, err := S.db.Exec(`UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND sender_id != ? AND is_read = 0`, chatID, userID)
	if err != nil {
		fmt.Println("Seen Message", err)
		return err
	}
	return nil
}

// get the last message betwen two users
func (S *Server) GetLastMessageID(chatID string) (int, error) {
	var message int
	query := `SELECT id FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1`
	err := S.db.QueryRow(query, chatID).Scan(&message)
	if err != nil {
		fmt.Println(err)
		return 0, err
	}
	return message, nil
}

func (S *Server) GetLastMessageContent(chatID string) (Message, error) {
	var message Message
	query := `SELECT id, content FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1`
	err := S.db.QueryRow(query, chatID).Scan(&message.ID, &message.Content)
	if err != nil {
		fmt.Println(err)
		return Message{}, err
	}
	return message, nil
}
