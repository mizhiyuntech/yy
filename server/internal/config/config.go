package config

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// DatabaseConfig holds MySQL connection settings collected during installation.
type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// Config is the application configuration persisted next to the binary.
type Config struct {
	Installed bool           `json:"installed"`
	JWTSecret string         `json:"jwt_secret"`
	SiteName  string         `json:"site_name"`
	Database  DatabaseConfig `json:"database"`

	path string
	mu   sync.RWMutex
}

const fileName = "config.json"

// configDir returns the directory that holds the config file. It sits next to
// the running binary so that the binary and its data live in the same place.
func configDir() string {
	exe, err := os.Executable()
	if err != nil {
		if wd, wErr := os.Getwd(); wErr == nil {
			return wd
		}
		return "."
	}
	return filepath.Dir(exe)
}

// Path returns the absolute path of the config file.
func Path() string {
	return filepath.Join(configDir(), fileName)
}

// Load reads the config from disk. If the file does not exist an empty,
// not-yet-installed config is returned.
func Load() (*Config, error) {
	p := Path()
	c := &Config{path: p, SiteName: "YY IM"}

	data, err := os.ReadFile(p)
	if err != nil {
		if os.IsNotExist(err) {
			return c, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, c); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	c.path = p
	return c, nil
}

// Save persists the config atomically to disk.
func (c *Config) Save() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	tmp := c.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, c.path)
}

// IsInstalled reports whether the application has completed installation.
func (c *Config) IsInstalled() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Installed
}

// DSN builds the MySQL data source name from the database config.
func (c *Config) DSN() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	d := c.Database
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.Name,
	)
}

// GenerateSecret returns a random hex secret suitable for signing JWTs.
func GenerateSecret() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "yy-im-default-insecure-secret-change-me"
	}
	return hex.EncodeToString(b)
}
