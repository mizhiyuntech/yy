package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/config"
	"github.com/mizhiyuntech/yy/server/internal/database"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/utils"
)

// Default admin credentials created when the installer is run without overrides.
const (
	DefaultAdminUser = "admin"
	DefaultAdminPass = "admin123"
)

type installRequest struct {
	DBHost     string `json:"db_host"`
	DBPort     int    `json:"db_port"`
	DBUser     string `json:"db_user"`
	DBPassword string `json:"db_password"`
	DBName     string `json:"db_name"`
	SiteName   string `json:"site_name"`
	AdminUser  string `json:"admin_user"`
	AdminPass  string `json:"admin_pass"`
}

// InstallStatus reports whether the system has been installed.
func (a *App) InstallStatus(c *gin.Context) {
	ok(c, gin.H{
		"installed": a.Cfg.IsInstalled(),
		"site_name": a.Cfg.SiteName,
	})
}

// Install performs first-run setup: validates the DB, migrates schema, and
// creates the default administrator account.
func (a *App) Install(c *gin.Context) {
	if a.Cfg.IsInstalled() {
		fail(c, http.StatusBadRequest, "system already installed")
		return
	}

	var req installRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}

	req.DBHost = strings.TrimSpace(req.DBHost)
	req.DBName = strings.TrimSpace(req.DBName)
	if req.DBHost == "" || req.DBName == "" || req.DBUser == "" {
		fail(c, http.StatusBadRequest, "database host, name and user are required")
		return
	}
	if req.DBPort == 0 {
		req.DBPort = 3306
	}
	if req.AdminUser == "" {
		req.AdminUser = DefaultAdminUser
	}
	if req.AdminPass == "" {
		req.AdminPass = DefaultAdminPass
	}
	if req.SiteName == "" {
		req.SiteName = "YY IM"
	}

	dbCfg := config.DatabaseConfig{
		Host:     req.DBHost,
		Port:     req.DBPort,
		User:     req.DBUser,
		Password: req.DBPassword,
		Name:     req.DBName,
	}
	a.Cfg.Database = dbCfg

	db, err := database.Connect(a.Cfg.DSN())
	if err != nil {
		fail(c, http.StatusBadRequest, "cannot connect to database: "+err.Error())
		return
	}
	if err := database.Migrate(db); err != nil {
		fail(c, http.StatusInternalServerError, "migration failed: "+err.Error())
		return
	}

	hash, err := utils.HashPassword(req.AdminPass)
	if err != nil {
		fail(c, http.StatusInternalServerError, "cannot hash password")
		return
	}
	admin := models.User{
		Username: req.AdminUser,
		Password: hash,
		Nickname: "Administrator",
		Role:     models.RoleAdmin,
		Status:   1,
	}
	if err := db.Where("username = ?", req.AdminUser).FirstOrCreate(&admin).Error; err != nil {
		fail(c, http.StatusInternalServerError, "cannot create admin user")
		return
	}

	if a.Cfg.JWTSecret == "" {
		a.Cfg.JWTSecret = config.GenerateSecret()
	}
	a.Cfg.SiteName = req.SiteName
	a.Cfg.Installed = true
	if err := a.Cfg.Save(); err != nil {
		fail(c, http.StatusInternalServerError, "cannot persist configuration")
		return
	}

	a.SetDB(db)

	token, _ := utils.GenerateToken(a.Cfg.JWTSecret, admin.ID, admin.Username, admin.Role, 7*24*time.Hour)
	ok(c, gin.H{
		"installed":  true,
		"admin_user": req.AdminUser,
		"token":      token,
		"user":       admin,
	})
}
