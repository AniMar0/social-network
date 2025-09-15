package backend

import (
	"encoding/json"
	"net/http"
)

func (S *Server) GetNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := S.db.Query(`
		SELECT n.id, n.type, n.content, n.is_read, n.created_at,
		       u.id, u.first_name, u.last_name, u.avatar
		FROM notifications n
		JOIN users u ON u.id = n.actor_id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifs []map[string]interface{}
	for rows.Next() {
		var notif Notification
		if err := rows.Scan(&notif.ID, &notif.Type, &notif.Content, &notif.IsRead, &notif.CreatedAt,
			&notif.ActorID, &notif.FirstName, &notif.LastName, &notif.Avatar); err != nil {
			http.Error(w, "Error scanning row: "+err.Error(), http.StatusInternalServerError)
			return
		}

		notifs = append(notifs, map[string]interface{}{
			"id":        notif.ID,
			"type":      notif.Type,
			"content":   notif.Content,
			"isRead":    notif.IsRead,
			"timestamp": notif.CreatedAt,
			"user": map[string]interface{}{
				"id":     notif.ActorID,
				"name":   notif.FirstName + " " + notif.LastName,
				"avatar": notif.Avatar,
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

func (S *Server) IsertNotification(notif Notification) error {
	_, err := S.db.Exec(`
		INSERT INTO notifications (user_id, actor_id, type, content, is_read)
		VALUES (?, ?, ?, ?, ?)
	`, notif.ID, notif.ActorID, notif.Type, notif.Content, notif.IsRead)
	return err
}

func (S *Server) MarkNotificationAsReadHandler(w http.ResponseWriter, r *http.Request) {
	notificationID := r.URL.Path[len("/api/mark-notification-as-read/"):]
	_, err := S.db.Exec(`
		UPDATE notifications
		SET is_read = 1
		WHERE id = ?
	`, notificationID)
	if err != nil {
		http.Error(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

func (S *Server) DeleteNotificationHandler(w http.ResponseWriter, r *http.Request) {
	notificationID := r.URL.Path[len("/api/delete-notification/"):]

	_, err := S.db.Exec(`
		DELETE FROM notifications
		WHERE id = ?
	`, notificationID)
	if err != nil {
		http.Error(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
