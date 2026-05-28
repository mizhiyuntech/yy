package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mizhiyuntech/yy/server/internal/config"
	"github.com/mizhiyuntech/yy/server/internal/models"
	"github.com/mizhiyuntech/yy/server/internal/utils"
)

// Context keys for authenticated requests.
const (
	CtxUserID   = "uid"
	CtxUsername = "username"
	CtxRole     = "role"
)

// extractToken pulls the bearer token from the Authorization header or query.
func extractToken(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return c.Query("token")
}

// Auth validates the JWT and stores user claims on the context.
func Auth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "missing token"})
			return
		}
		claims, err := utils.ParseToken(cfg.JWTSecret, token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "invalid token"})
			return
		}
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUsername, claims.Username)
		c.Set(CtxRole, claims.Role)
		c.Next()
	}
}

// AdminOnly ensures the authenticated user has the admin role.
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString(CtxRole) != models.RoleAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"code": 403, "message": "admin only"})
			return
		}
		c.Next()
	}
}

// UserID is a helper to read the authenticated user id from context.
func UserID(c *gin.Context) uint {
	v, _ := c.Get(CtxUserID)
	if id, ok := v.(uint); ok {
		return id
	}
	return 0
}
