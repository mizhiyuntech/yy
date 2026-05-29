package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/utils"
)

// AdminStats returns dashboard summary counters.
func (a *App) AdminStats(c *gin.Context) {
	var users, messages, conversations, groups int64
	a.DB.Model(&models.User{}).Count(&users)
	a.DB.Model(&models.Message{}).Count(&messages)
	a.DB.Model(&models.Conversation{}).Count(&conversations)
	a.DB.Model(&models.Conversation{}).Where("type = ?", models.ConversationGroup).Count(&groups)

	ok(c, gin.H{
		"users":         users,
		"messages":      messages,
		"conversations": conversations,
		"groups":        groups,
		"online":        a.Hub.OnlineCount(),
	})
}

// AdminListUsers returns a paginated, searchable list of users.
func (a *App) AdminListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	keyword := c.Query("keyword")

	q := a.DB.Model(&models.User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("username LIKE ? OR nickname LIKE ?", like, like)
	}

	var total int64
	q.Count(&total)

	var users []models.User
	q.Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&users)

	for i := range users {
		users[i].Online = a.Hub.IsOnline(users[i].ID)
	}

	ok(c, gin.H{"list": users, "total": total, "page": page, "size": size})
}

type adminCreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
}

// AdminCreateUser lets an administrator create an account directly.
func (a *App) AdminCreateUser(c *gin.Context) {
	var req adminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || len(req.Password) < 6 {
		fail(c, http.StatusBadRequest, "username and password(>=6) are required")
		return
	}
	var count int64
	a.DB.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		fail(c, http.StatusConflict, "username already taken")
		return
	}
	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		fail(c, http.StatusInternalServerError, "cannot hash password")
		return
	}
	role := req.Role
	if role != models.RoleAdmin {
		role = models.RoleUser
	}
	nickname := req.Nickname
	if nickname == "" {
		nickname = req.Username
	}
	user := models.User{Username: req.Username, Password: hash, Nickname: nickname, Role: role, Status: 1}
	if err := a.DB.Create(&user).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot create user")
		return
	}
	ok(c, user)
}

type updateStatusRequest struct {
	Status int `json:"status"`
}

// AdminUpdateUserStatus enables or disables an account.
func (a *App) AdminUpdateUserStatus(c *gin.Context) {
	id := c.Param("id")
	var req updateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	a.DB.Model(&models.User{}).Where("id = ?", id).Update("status", req.Status)
	okMsg(c, "updated")
}

// AdminDeleteUser removes a user account.
func (a *App) AdminDeleteUser(c *gin.Context) {
	id := c.Param("id")
	a.DB.Delete(&models.User{}, id)
	okMsg(c, "deleted")
}

type banUserRequest struct {
	Reason string `json:"reason"`
	Start  string `json:"start"` // optional RFC3339 / ISO datetime
	End    string `json:"end"`   // optional RFC3339 / ISO datetime
}

// parseBanTime accepts an RFC3339 timestamp (optionally without timezone) and
// returns nil for empty input.
func parseBanTime(v string) (*time.Time, error) {
	if v == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04", "2006-01-02"} {
		if t, err := time.Parse(layout, v); err == nil {
			return &t, nil
		}
	}
	return nil, fmt.Errorf("invalid time format: %s", v)
}

// banMessage builds a human-readable rejection message for a banned account.
func banMessage(u *models.User) string {
	msg := "account banned"
	if u.BanReason != "" {
		msg += ": " + u.BanReason
	}
	if u.BanEnd != nil {
		msg += " (until " + u.BanEnd.Format("2006-01-02 15:04") + ")"
	}
	return msg
}

// AdminBanUser bans a user with a reason and an optional active window.
func (a *App) AdminBanUser(c *gin.Context) {
	id := c.Param("id")
	var req banUserRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Reason == "" {
		fail(c, http.StatusBadRequest, "ban reason is required")
		return
	}
	start, err := parseBanTime(req.Start)
	if err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	end, err := parseBanTime(req.End)
	if err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if start != nil && end != nil && end.Before(*start) {
		fail(c, http.StatusBadRequest, "end time must be after start time")
		return
	}

	var user models.User
	if err := a.DB.First(&user, id).Error; err != nil {
		fail(c, http.StatusNotFound, "user not found")
		return
	}
	if user.Role == models.RoleAdmin {
		fail(c, http.StatusForbidden, "cannot ban an administrator")
		return
	}
	if err := a.DB.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"banned":     true,
		"ban_reason": req.Reason,
		"ban_start":  start,
		"ban_end":    end,
	}).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot ban user")
		return
	}
	okMsg(c, "banned")
}

// AdminUnbanUser lifts a ban on a user.
func (a *App) AdminUnbanUser(c *gin.Context) {
	id := c.Param("id")
	if err := a.DB.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"banned":     false,
		"ban_reason": "",
		"ban_start":  nil,
		"ban_end":    nil,
	}).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot unban user")
		return
	}
	okMsg(c, "unbanned")
}

// AdminListGroups returns a paginated list of group conversations enriched with
// owner and member-count information for moderation.
func (a *App) AdminListGroups(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	keyword := c.Query("keyword")

	q := a.DB.Model(&models.Conversation{}).Where("type = ?", models.ConversationGroup)
	if keyword != "" {
		q = q.Where("name LIKE ?", "%"+keyword+"%")
	}

	var total int64
	q.Count(&total)

	var groups []models.Conversation
	q.Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&groups)

	type groupView struct {
		models.Conversation
		OwnerName   string `json:"owner_name"`
		MemberCount int64  `json:"member_count"`
	}
	list := make([]groupView, 0, len(groups))
	for _, g := range groups {
		view := groupView{Conversation: g}
		a.DB.Model(&models.ConversationMember{}).Where("conversation_id = ?", g.ID).Count(&view.MemberCount)
		var owner models.User
		if a.DB.Select("nickname", "username").First(&owner, g.OwnerID).Error == nil {
			view.OwnerName = owner.Nickname
			if view.OwnerName == "" {
				view.OwnerName = owner.Username
			}
		}
		list = append(list, view)
	}
	ok(c, gin.H{"list": list, "total": total, "page": page, "size": size})
}

// AdminListGroupMembers returns the members of a group conversation.
func (a *App) AdminListGroupMembers(c *gin.Context) {
	id := c.Param("id")
	var members []models.ConversationMember
	a.DB.Preload("User").Where("conversation_id = ?", id).Order("id ASC").Find(&members)
	ok(c, gin.H{"list": members})
}

// AdminRemoveGroupMember removes a single member from a group.
func (a *App) AdminRemoveGroupMember(c *gin.Context) {
	id := c.Param("id")
	uid := c.Param("uid")
	a.DB.Where("conversation_id = ? AND user_id = ?", id, uid).Delete(&models.ConversationMember{})
	okMsg(c, "removed")
}

// AdminDeleteGroup dissolves a group conversation, removing its members and
// messages.
func (a *App) AdminDeleteGroup(c *gin.Context) {
	id := c.Param("id")
	var conv models.Conversation
	if err := a.DB.First(&conv, id).Error; err != nil {
		fail(c, http.StatusNotFound, "group not found")
		return
	}
	if conv.Type != models.ConversationGroup {
		fail(c, http.StatusBadRequest, "not a group conversation")
		return
	}
	a.DB.Where("conversation_id = ?", id).Delete(&models.Message{})
	a.DB.Where("conversation_id = ?", id).Delete(&models.ConversationMember{})
	a.DB.Delete(&models.Conversation{}, id)
	okMsg(c, "dissolved")
}

// AdminListMessages returns recent messages across all conversations.
func (a *App) AdminListMessages(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	var total int64
	a.DB.Model(&models.Message{}).Count(&total)

	var messages []models.Message
	a.DB.Preload("Sender").Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&messages)
	ok(c, gin.H{"list": messages, "total": total, "page": page, "size": size})
}

// AdminListConversations returns conversations for moderation.
func (a *App) AdminListConversations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	var total int64
	a.DB.Model(&models.Conversation{}).Count(&total)

	var conversations []models.Conversation
	a.DB.Preload("Members.User").Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&conversations)
	ok(c, gin.H{"list": conversations, "total": total, "page": page, "size": size})
}
