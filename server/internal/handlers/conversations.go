package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
	"github.com/mizhiyuntech/yy/server/internal/models"
)

// conversationView is a conversation enriched with the data the client needs.
type conversationView struct {
	models.Conversation
	LastMessage *models.Message `json:"last_message,omitempty"`
	Unread      int64           `json:"unread"`
	Peer        *models.User    `json:"peer,omitempty"`
}

// memberIDs returns the user ids participating in a conversation.
func (a *App) memberIDs(conversationID uint) []uint {
	var ids []uint
	a.DB.Model(&models.ConversationMember{}).
		Where("conversation_id = ?", conversationID).
		Pluck("user_id", &ids)
	return ids
}

// isMember reports whether a user belongs to a conversation.
func (a *App) isMember(conversationID, userID uint) bool {
	var count int64
	a.DB.Model(&models.ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Count(&count)
	return count > 0
}

// ListConversations returns conversations the current user belongs to.
func (a *App) ListConversations(c *gin.Context) {
	uid := middleware.UserID(c)

	var memberships []models.ConversationMember
	a.DB.Where("user_id = ?", uid).Find(&memberships)

	views := make([]conversationView, 0, len(memberships))
	for _, m := range memberships {
		var conv models.Conversation
		if err := a.DB.First(&conv, m.ConversationID).Error; err != nil {
			continue
		}
		view := conversationView{Conversation: conv}

		var last models.Message
		if err := a.DB.Where("conversation_id = ?", conv.ID).
			Order("id DESC").First(&last).Error; err == nil {
			view.LastMessage = &last
		}

		a.DB.Model(&models.Message{}).
			Where("conversation_id = ? AND id > ? AND sender_id <> ?", conv.ID, m.LastReadMessageID, uid).
			Count(&view.Unread)

		if conv.Type == models.ConversationPrivate {
			var peer models.ConversationMember
			if err := a.DB.Preload("User").
				Where("conversation_id = ? AND user_id <> ?", conv.ID, uid).
				First(&peer).Error; err == nil {
				view.Peer = peer.User
			}
		}
		views = append(views, view)
	}
	ok(c, views)
}

type privateConversationRequest struct {
	PeerID uint `json:"peer_id"`
}

// OpenPrivateConversation returns the existing 1:1 conversation with a peer or
// creates one if needed.
func (a *App) OpenPrivateConversation(c *gin.Context) {
	var req privateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PeerID == 0 {
		fail(c, http.StatusBadRequest, "peer_id is required")
		return
	}
	uid := middleware.UserID(c)
	if req.PeerID == uid {
		fail(c, http.StatusBadRequest, "cannot chat with yourself")
		return
	}

	// Find an existing private conversation shared by both users.
	var existingID uint
	a.DB.Raw(`
		SELECT cm.conversation_id FROM conversation_members cm
		JOIN conversations c ON c.id = cm.conversation_id
		WHERE c.type = ? AND cm.user_id IN (?, ?)
		GROUP BY cm.conversation_id
		HAVING COUNT(DISTINCT cm.user_id) = 2
		LIMIT 1`, models.ConversationPrivate, uid, req.PeerID).Scan(&existingID)

	if existingID != 0 {
		var conv models.Conversation
		a.DB.First(&conv, existingID)
		ok(c, conv)
		return
	}

	conv := models.Conversation{Type: models.ConversationPrivate, OwnerID: uid}
	if err := a.DB.Create(&conv).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot create conversation")
		return
	}
	a.DB.Create(&models.ConversationMember{ConversationID: conv.ID, UserID: uid, Role: "owner"})
	a.DB.Create(&models.ConversationMember{ConversationID: conv.ID, UserID: req.PeerID, Role: "member"})
	ok(c, conv)
}

type createGroupRequest struct {
	Name      string `json:"name"`
	MemberIDs []uint `json:"member_ids"`
}

// CreateGroup creates a group conversation owned by the current user.
func (a *App) CreateGroup(c *gin.Context) {
	var req createGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		fail(c, http.StatusBadRequest, "name is required")
		return
	}
	uid := middleware.UserID(c)
	conv := models.Conversation{Type: models.ConversationGroup, Name: req.Name, OwnerID: uid}
	if err := a.DB.Create(&conv).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot create group")
		return
	}
	a.DB.Create(&models.ConversationMember{ConversationID: conv.ID, UserID: uid, Role: "owner"})

	seen := map[uint]bool{uid: true}
	for _, mid := range req.MemberIDs {
		if seen[mid] {
			continue
		}
		seen[mid] = true
		a.DB.Create(&models.ConversationMember{ConversationID: conv.ID, UserID: mid, Role: "member"})
	}
	ok(c, conv)
}

// ListMessages returns paginated messages for a conversation (newest first).
func (a *App) ListMessages(c *gin.Context) {
	convID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	uid := middleware.UserID(c)
	if !a.isMember(uint(convID), uid) {
		fail(c, http.StatusForbidden, "not a member of this conversation")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	beforeID, _ := strconv.ParseUint(c.DefaultQuery("before", "0"), 10, 64)

	q := a.DB.Preload("Sender").Where("conversation_id = ?", convID)
	if beforeID > 0 {
		q = q.Where("id < ?", beforeID)
	}
	var messages []models.Message
	q.Order("id DESC").Limit(limit).Find(&messages)

	// Return chronological order for convenience.
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	ok(c, messages)
}

type markReadRequest struct {
	LastMessageID uint `json:"last_message_id"`
}

// MarkRead updates the read cursor for the current user in a conversation.
func (a *App) MarkRead(c *gin.Context) {
	convID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req markReadRequest
	_ = c.ShouldBindJSON(&req)
	a.DB.Model(&models.ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, middleware.UserID(c)).
		Update("last_read_message_id", req.LastMessageID)
	okMsg(c, "ok")
}
