package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

// get all users from chats table who are chatting withe the current user
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

	rows, err := S.db.Query(`
        SELECT 
            u.id, u.first_name || ' ' || u.last_name AS name,
            u.nickname, u.avatar,
            m.content AS last_message,
            m.created_at AS timestamp,
            SUM(CASE WHEN m.is_read = 0 AND m.sender_id != ? THEN 1 ELSE 0 END) AS unread_count
        FROM chats c
        JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id) AND u.id != ?
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE c.user1_id = ? OR c.user2_id = ?
        GROUP BY u.id, m.content, m.created_at
        ORDER BY m.created_at DESC;
    `, currentUserID, currentUserID, currentUserID, currentUserID)
	if err != nil {
		fmt.Println("db.Query", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var c Chat
		var lastMessage sql.NullString
		var timestamp sql.NullString
		var nickname sql.NullString

		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&nickname,
			&c.Avatar,
			&lastMessage,
			&timestamp,
			&c.UnreadCount,
		); err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		if nickname.Valid {
			c.Username = nickname.String
		} else {
			c.Username = ""
		}

		if lastMessage.Valid {
			c.LastMessage = lastMessage.String
		} else {
			c.LastMessage = ""
		}

		if timestamp.Valid {
			c.Timestamp = timestamp.String
		} else {
			c.Timestamp = ""
		}
		connections := S.GetConnections(tools.StringToInt(c.ID))

		if len(connections) > 0 {
			online := true
			c.IsOnline = &online
		}
		chats = append(chats, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

// GetUserProfileHandler get user profile
func (S *Server) GetUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	id, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userData, err := S.GetUserData("", id)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userData)
}
