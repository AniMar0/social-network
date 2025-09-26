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
		fmt.Println("send encode error : ", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	message.ChatID = tools.StringToInt(ChatID)

	S.SendMessage(currentUserID, message)

	resiverID := S.GetOtherUserID(currentUserID, message.ChatID)
	message.SenderID = currentUserID

	if len(S.Users[currentUserID]) > 1 {
		message.IsOwn = true
		S.PushMessage(SessionID, currentUserID, message)
	}

	if S.Users[resiverID] != nil {
		message.IsOwn = false
		S.PushMessage("", resiverID, message)
	}

	message.IsOwn = true
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

func (S *Server) SendMessage(currentUserID int, message Message) error {
	var replyTo sql.NullString
	if message.ReplyTo != nil {
		replyTo = sql.NullString{String: message.ReplyTo.ID, Valid: true}
	} else {
		replyTo = sql.NullString{Valid: false}
	}

	query := `INSERT INTO messages (sender_id, id, chat_id, content, is_read, type, reply_to) VALUES (?,?, ?, ? , ?, ?, ?)`
	_, err := S.db.Exec(query, currentUserID, message.ID, message.ChatID, message.Content, message.IsRead, message.Type, replyTo)
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
	query := `SELECT id, sender_id, content, is_read, type, read_at, reply_to FROM messages WHERE chat_id = ?`
	rows, err := S.db.Query(query, chatID)
	if err != nil {
		fmt.Println("Get Messages Query Error : ", err)
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var message Message
		var readAt sql.NullTime
		var replyTo sql.NullString
		err = rows.Scan(&message.ID, &message.SenderID, &message.Content, &message.IsRead, &message.Type, &readAt, &replyTo)
		if readAt.Valid {
			message.Timestamp = readAt.Time.String()
		}
		if replyTo.Valid {
			ms := S.GetMessageContent(replyTo.String)
			message.ReplyTo = &ReplyInfo{ID: ms.ID, Content: ms.Content, Type: ms.Type, IsOwn: ms.SenderID == currentUserID}
		}

		if err != nil {
			fmt.Println("Get Messages Scan Error : ", err)
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
		fmt.Println("Get Other User ID Query Error : ", err)
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
			m.id,
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
			var lastMessageId sql.NullString
			var timestamp sql.NullString
			var nickname sql.NullString
			var senderID sql.NullString
			var lastMessageType sql.NullString
			if err := rows.Scan(
				&c.ID,
				&c.Name,
				&nickname,
				&lastMessageId,
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

			if lastMessageId.Valid {
				c.LastMessageID = lastMessageId.String
				//fmt.Println("Last message:", c.LastMessageID)
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
	GetLastMessage, _ := S.GetLastMessageContent(chatID)

	S.PushMessageSeen(userId, map[string]interface{}{
		"message": GetLastMessage,
		"chat_id": chatID,
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

func (S *Server) GetLastMessageID(chatID string) (string, error) {
	var message string
	query := `SELECT id FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1`
	err := S.db.QueryRow(query, chatID).Scan(&message)
	if err != nil {
		fmt.Println("Get Last Message ID Error :", err)
		return "", err
	}
	return message, nil
}

func (S *Server) GetLastMessageContent(chatID string) (Message, error) {
	var message Message
	var timestamp sql.NullString
	query := `SELECT id, sender_id, is_read, read_at, content, type,created_at FROM messages WHERE chat_id = ? ORDER BY backend_id DESC LIMIT 1`
	err := S.db.QueryRow(query, chatID).Scan(&message.ID, &message.SenderID, &message.IsRead, &timestamp, &message.Content, &message.Type, &message.Timestamp)
	if timestamp.Valid {
		message.Timestamp = timestamp.String
	}
	if err != nil {
		fmt.Println("Get Last Message Content Error : ", err)
		return Message{}, err
	}
	return message, nil
}

func (S *Server) GetMessageContent(messageID string) Message {
	var message Message
	query := `SELECT id, content FROM messages WHERE id = ?`
	S.db.QueryRow(query, messageID).Scan(&message.ID, &message.Content)
	return message
}

func (S *Server) UnsendMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}
	messageID := r.URL.Path[len("/api/unsend-message/"):]
	currentUserID, sessionID, err := S.CheckSession(r)

	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	chatID, err := S.GetChatIDFromMessageID(messageID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	err = S.UnsendMessage(messageID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	resiverID := S.GetOtherUserID(currentUserID, tools.StringToInt(chatID))

	message, err := S.GetLastMessageContent(chatID)
	if err != nil {
		if err != sql.ErrNoRows {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
	}

	message.ChatID = tools.StringToInt(chatID)

	if len(S.Users[currentUserID]) > 1 {
		S.PushChatDelete(sessionID, currentUserID, map[string]interface{}{
			"new_message":    message,
			"old_message_id": messageID,
			"chat_id":        chatID,
		})

	}

	S.PushChatDelete("", resiverID, map[string]interface{}{
		"new_message":    message,
		"old_message_id": messageID,
		"chat_id":        chatID,
	})

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

func (S *Server) UnsendMessage(messageID string) error {
	_, err := S.db.Exec(`DELETE FROM messages WHERE id = ?`, messageID)
	if err != nil {
		fmt.Println(err)
		return err
	}
	return nil
}

func (S *Server) GetChatIDFromMessageID(messageID string) (string, error) {
	var chatID string
	query := `SELECT chat_id FROM messages WHERE id = ?`
	err := S.db.QueryRow(query, messageID).Scan(&chatID)
	if err != nil {
		fmt.Println(err)
		return "", err
	}
	return chatID, nil
}
