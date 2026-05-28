package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// wsSendPayload is the data field of a client "send" frame.
type wsSendPayload struct {
	ConversationID uint   `json:"conversation_id"`
	Type           string `json:"type"`
	Content        string `json:"content"`
}

// wsReadPayload is the data field of a client "read" frame.
type wsReadPayload struct {
	ConversationID uint `json:"conversation_id"`
	LastMessageID  uint `json:"last_message_id"`
}

// ServeWS upgrades the HTTP connection to a WebSocket and starts the client.
func (a *App) ServeWS(c *gin.Context) {
	uid := middleware.UserID(c)
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := ws.NewClient(a.Hub, conn, uid, a.handleFrame)
	client.Start()

	// Notify contacts this user came online.
	a.broadcastPresence(uid, true)
}

// handleFrame processes an inbound WebSocket frame from a client.
func (a *App) handleFrame(client *ws.Client, env ws.Envelope) {
	switch env.Type {
	case "send":
		var p wsSendPayload
		if err := json.Unmarshal(env.Data, &p); err != nil || p.ConversationID == 0 {
			return
		}
		if !a.isMember(p.ConversationID, client.UserID()) {
			return
		}
		_, _ = a.SendMessage(client.UserID(), p.ConversationID, p.Type, p.Content)
	case "read":
		var p wsReadPayload
		if err := json.Unmarshal(env.Data, &p); err != nil || p.ConversationID == 0 {
			return
		}
		a.DB.Model(&models.ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", p.ConversationID, client.UserID()).
			Update("last_read_message_id", p.LastMessageID)
		a.Hub.SendToUsers(a.memberIDs(p.ConversationID), ws.OutEvent{
			Type: ws.EventRead,
			Data: gin.H{"conversation_id": p.ConversationID, "user_id": client.UserID(), "last_message_id": p.LastMessageID},
		})
	}
}

// broadcastPresence informs a user's contacts about their online state.
func (a *App) broadcastPresence(userID uint, online bool) {
	var ids []uint
	a.DB.Model(&models.Friendship{}).Where("friend_id = ? AND status = 1", userID).Pluck("user_id", &ids)
	a.Hub.SendToUsers(ids, ws.OutEvent{
		Type: ws.EventPresence,
		Data: gin.H{"user_id": userID, "online": online},
	})
}
