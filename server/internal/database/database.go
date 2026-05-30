package database

import (
	"fmt"
	"log"
	"time"

	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/version"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// Connect opens a GORM connection to MySQL using the given DSN.
func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

// Migrate creates or updates all tables.
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Friendship{},
		&models.Conversation{},
		&models.ConversationMember{},
		&models.Message{},
		&models.SystemConfig{},
	)
}

// CurrentSchemaVersion returns the version recorded in the database, or an
// empty string if none has been stored yet.
func CurrentSchemaVersion(db *gorm.DB) string {
	var cfg models.SystemConfig
	if err := db.Where("`key` = ?", version.SchemaVersionKey).First(&cfg).Error; err != nil {
		return ""
	}
	return cfg.Value
}

// EnsureSchemaVersion brings the database up to the current application version.
// When the stored version differs from version.Current, it runs the migration
// (adding any new tables/fields) and records the new version. Returns the
// version the database was at before upgrading.
func EnsureSchemaVersion(db *gorm.DB) (previous string, err error) {
	previous = CurrentSchemaVersion(db)
	if previous == version.Current {
		return previous, nil
	}
	if err = Migrate(db); err != nil {
		return previous, err
	}
	rec := models.SystemConfig{Key: version.SchemaVersionKey, Value: version.Current}
	if err = db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
	}).Create(&rec).Error; err != nil {
		return previous, err
	}
	if previous == "" {
		log.Printf("database initialized at version %s", version.Current)
	} else {
		log.Printf("database upgraded from %s to %s", previous, version.Current)
	}
	return previous, nil
}
