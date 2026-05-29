package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/mizhiyuntech/yy/server/internal/config"
	"github.com/mizhiyuntech/yy/server/internal/database"
	"github.com/mizhiyuntech/yy/server/internal/handlers"
	"github.com/mizhiyuntech/yy/server/internal/server"
	"github.com/mizhiyuntech/yy/server/internal/version"
	"github.com/mizhiyuntech/yy/server/internal/ws"
	"gorm.io/gorm"
)

// defaultPort is the fixed listening port for the backend service.
const defaultPort = "2026"

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = config.GenerateSecret()
	}

	hub := ws.NewHub()
	go hub.Run()

	var db *gorm.DB
	if cfg.IsInstalled() {
		db, err = database.Connect(cfg.DSN())
		if err != nil {
			log.Fatalf("connect database: %v", err)
		}
		// Auto-upgrade the schema to the current version on startup so that
		// new tables/fields take effect after a backend restart.
		if _, err := database.EnsureSchemaVersion(db); err != nil {
			log.Fatalf("migrate database: %v", err)
		}
		log.Printf("database connected, system installed (version %s)", version.Current)
	} else {
		log.Println("system not installed yet, visit the site to run the installer")
	}

	app := handlers.New(cfg, db, hub)
	router := server.NewRouter(app, cfg)

	port := os.Getenv("YY_PORT")
	if port == "" {
		port = defaultPort
	}
	addr := ":" + port

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // disabled for long-lived WebSocket connections
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("YY IM backend listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
