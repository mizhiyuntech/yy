package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/utils"
)

const tokenTTL = 7 * 24 * time.Hour

type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Register creates a new end-user account for the mobile app.
func (a *App) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	if len(req.Username) < 3 || len(req.Password) < 6 {
		fail(c, http.StatusBadRequest, "username must be >=3 chars and password >=6 chars")
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
	nickname := req.Nickname
	if nickname == "" {
		nickname = req.Username
	}
	user := models.User{
		Username: req.Username,
		Password: hash,
		Nickname: nickname,
		Role:     models.RoleUser,
		Status:   1,
	}
	if err := a.DB.Create(&user).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot create user")
		return
	}

	token, _ := utils.GenerateToken(a.Cfg.JWTSecret, user.ID, user.Username, user.Role, tokenTTL)
	ok(c, gin.H{"token": token, "user": user})
}

// Login authenticates a user (or admin) and returns a JWT.
func (a *App) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}

	var user models.User
	if err := a.DB.Where("username = ?", strings.TrimSpace(req.Username)).First(&user).Error; err != nil {
		fail(c, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if user.Status != 1 {
		fail(c, http.StatusForbidden, "account disabled")
		return
	}
	if !utils.CheckPassword(user.Password, req.Password) {
		fail(c, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if user.IsBanned(time.Now()) {
		fail(c, http.StatusForbidden, banMessage(&user))
		return
	}

	token, _ := utils.GenerateToken(a.Cfg.JWTSecret, user.ID, user.Username, user.Role, tokenTTL)
	ok(c, gin.H{"token": token, "user": user})
}

// Me returns the currently authenticated user's profile.
func (a *App) Me(c *gin.Context) {
	var user models.User
	if err := a.DB.First(&user, middleware.UserID(c)).Error; err != nil {
		fail(c, http.StatusNotFound, "user not found")
		return
	}
	ok(c, user)
}

type updateProfileRequest struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

// UpdateProfile updates editable fields of the current user.
func (a *App) UpdateProfile(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	updates := map[string]interface{}{}
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if len(updates) > 0 {
		a.DB.Model(&models.User{}).Where("id = ?", middleware.UserID(c)).Updates(updates)
	}
	var user models.User
	a.DB.First(&user, middleware.UserID(c))
	ok(c, user)
}
