package server

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/config"
	"github.com/mizhiyuntech/yy/server/internal/handlers"
	"github.com/mizhiyuntech/yy/server/internal/middleware"
)

// webDir returns the directory holding the admin static assets. It lives next
// to the binary so that deployment is just "binary + web/".
func webDir() string {
	if env := os.Getenv("YY_WEB_DIR"); env != "" {
		return env
	}
	exe, err := os.Executable()
	if err != nil {
		return "web"
	}
	return filepath.Join(filepath.Dir(exe), "web")
}

// NewRouter builds the Gin engine with API routes and static hosting.
func NewRouter(app *handlers.App, cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	api := r.Group("/api")
	registerAPI(api, app, cfg)

	mountStatic(r)
	return r
}

func registerAPI(api *gin.RouterGroup, app *handlers.App, cfg *config.Config) {
	api.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	// Installation endpoints are always available.
	api.GET("/install/status", app.InstallStatus)
	api.POST("/install", app.Install)

	// requireInstalled blocks app/admin endpoints until setup is finished.
	requireInstalled := func(c *gin.Context) {
		if !cfg.IsInstalled() || app.DB == nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "system not installed"})
			return
		}
		c.Next()
	}

	pub := api.Group("", requireInstalled)
	pub.POST("/auth/register", app.Register)
	pub.POST("/auth/login", app.Login)

	auth := api.Group("", requireInstalled, middleware.Auth(cfg))
	auth.GET("/me", app.Me)
	auth.PUT("/me", app.UpdateProfile)

	auth.GET("/users/search", app.SearchUsers)
	auth.GET("/contacts", app.ListContacts)
	auth.POST("/contacts", app.AddContact)
	auth.DELETE("/contacts/:id", app.DeleteContact)

	auth.GET("/conversations", app.ListConversations)
	auth.POST("/conversations/private", app.OpenPrivateConversation)
	auth.POST("/conversations/group", app.CreateGroup)
	auth.GET("/conversations/:id/messages", app.ListMessages)
	auth.POST("/conversations/:id/messages", app.PostMessage)
	auth.POST("/conversations/:id/read", app.MarkRead)

	auth.GET("/ws", app.ServeWS)

	admin := api.Group("/admin", requireInstalled, middleware.Auth(cfg), middleware.AdminOnly())
	admin.GET("/stats", app.AdminStats)
	admin.GET("/users", app.AdminListUsers)
	admin.POST("/users", app.AdminCreateUser)
	admin.PUT("/users/:id/status", app.AdminUpdateUserStatus)
	admin.POST("/users/:id/ban", app.AdminBanUser)
	admin.POST("/users/:id/unban", app.AdminUnbanUser)
	admin.DELETE("/users/:id", app.AdminDeleteUser)
	admin.GET("/messages", app.AdminListMessages)
	admin.GET("/conversations", app.AdminListConversations)
	admin.GET("/groups", app.AdminListGroups)
	admin.GET("/groups/:id/members", app.AdminListGroupMembers)
	admin.DELETE("/groups/:id/members/:uid", app.AdminRemoveGroupMember)
	admin.DELETE("/groups/:id", app.AdminDeleteGroup)
}

// mountStatic serves the admin SPA from the web directory with history-mode
// fallback to index.html.
func mountStatic(r *gin.Engine) {
	dir := webDir()
	index := filepath.Join(dir, "index.html")

	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "not found"})
			return
		}
		// Serve the requested static asset if it exists.
		if p != "/" {
			full := filepath.Join(dir, filepath.Clean(p))
			if info, err := os.Stat(full); err == nil && !info.IsDir() {
				c.File(full)
				return
			}
		}
		// Otherwise fall back to the SPA entry point.
		if _, err := os.Stat(index); err == nil {
			c.File(index)
			return
		}
		c.String(http.StatusOK, "YY IM backend is running. Build the admin dashboard into the ./web directory.")
	})
}
