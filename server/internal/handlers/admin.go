package handlers

import (
	"net/http"
	"strconv"

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
