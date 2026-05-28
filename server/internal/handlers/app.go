package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/config"
	"github.com/mizhiyuntech/yy/server/internal/ws"
	"gorm.io/gorm"
)

// App carries shared dependencies for all HTTP handlers.
type App struct {
	Cfg *config.Config
	DB  *gorm.DB
	Hub *ws.Hub
}

// New creates an App. DB may be nil before installation completes.
func New(cfg *config.Config, db *gorm.DB, hub *ws.Hub) *App {
	return &App{Cfg: cfg, DB: db, Hub: hub}
}

// SetDB swaps in the database connection (used right after installation).
func (a *App) SetDB(db *gorm.DB) { a.DB = db }

func ok(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": data})
}

func okMsg(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": msg})
}

func fail(c *gin.Context, status int, msg string) {
	c.JSON(status, gin.H{"code": status, "message": msg})
}
