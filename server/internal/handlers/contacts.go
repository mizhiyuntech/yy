package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
	"github.com/mizhiyuntech/yy/server/internal/models"
)

// SearchUsers finds users by username or nickname (excluding self).
func (a *App) SearchUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		ok(c, []models.User{})
		return
	}
	var users []models.User
	like := "%" + keyword + "%"
	a.DB.Where("id <> ? AND (username LIKE ? OR nickname LIKE ?)", middleware.UserID(c), like, like).
		Limit(20).Find(&users)
	ok(c, users)
}

// ListContacts returns the current user's accepted contacts.
func (a *App) ListContacts(c *gin.Context) {
	var friends []models.Friendship
	a.DB.Preload("Friend").Where("user_id = ? AND status = 1", middleware.UserID(c)).Find(&friends)
	ok(c, friends)
}

type addContactRequest struct {
	FriendID uint   `json:"friend_id"`
	Remark   string `json:"remark"`
}

// AddContact creates a mutual friendship between two users.
func (a *App) AddContact(c *gin.Context) {
	var req addContactRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.FriendID == 0 {
		fail(c, http.StatusBadRequest, "friend_id is required")
		return
	}
	uid := middleware.UserID(c)
	if req.FriendID == uid {
		fail(c, http.StatusBadRequest, "cannot add yourself")
		return
	}

	var target models.User
	if err := a.DB.First(&target, req.FriendID).Error; err != nil {
		fail(c, http.StatusNotFound, "user not found")
		return
	}

	pairs := []models.Friendship{
		{UserID: uid, FriendID: req.FriendID, Remark: req.Remark, Status: 1},
		{UserID: req.FriendID, FriendID: uid, Status: 1},
	}
	for i := range pairs {
		var existing models.Friendship
		err := a.DB.Where("user_id = ? AND friend_id = ?", pairs[i].UserID, pairs[i].FriendID).First(&existing).Error
		if err != nil {
			a.DB.Create(&pairs[i])
		}
	}
	okMsg(c, "contact added")
}

// DeleteContact removes a friendship in both directions.
func (a *App) DeleteContact(c *gin.Context) {
	friendID := c.Param("id")
	uid := middleware.UserID(c)
	a.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		uid, friendID, friendID, uid).Delete(&models.Friendship{})
	okMsg(c, "contact removed")
}
