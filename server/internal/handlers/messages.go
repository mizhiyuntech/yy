package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/ws"
)

// SendMessage persists a message and broadcasts it to all conversation members.
// It is shared by the REST endpoint and the WebSocket handler.
func (a *App) SendMessage(senderID, conversationID uint, msgType, content string) (*models.Message, error) {
	if msgType == "" {
		msgType = models.MessageText
	}
	msg := models.Message{
		ConversationID: conversationID,
		SenderID:       senderID,
		Type:           msgType,
		Content:        content,
	}
	if err := a.DB.Create(&msg).Error; err != nil {
		return nil, err
	}

	a.DB.Model(&models.Conversation{}).Where("id = ?", conversationID).
		Update("updated_at", msg.CreatedAt)

	var sender models.User
	a.DB.First(&sender, senderID)
	msg.Sender = &sender

	a.Hub.SendToUsers(a.memberIDs(conversationID), ws.OutEvent{
		Type: ws.EventMessage,
		Data: msg,
	})
	return &msg, nil
}

type sendMessageRequest struct {
	Type    string `json:"type"`
	Content string `json:"content"`
}

// PostMessage is the REST fallback for sending a message to a conversation.
func (a *App) PostMessage(c *gin.Context) {
	convID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	uid := middleware.UserID(c)
	if !a.isMember(uint(convID), uid) {
		fail(c, http.StatusForbidden, "not a member of this conversation")
		return
	}

	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		fail(c, http.StatusBadRequest, "content is required")
		return
	}

	msg, err := a.SendMessage(uid, uint(convID), req.Type, req.Content)
	if err != nil {
		fail(c, http.StatusInternalServerError, "cannot send message")
		return
	}
	ok(c, msg)
}
