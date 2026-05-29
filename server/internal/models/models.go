package models

import "time"

// Role constants for users.
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// Conversation types.
const (
	ConversationPrivate = "private"
	ConversationGroup   = "group"
)

// Message types.
const (
	MessageText   = "text"
	MessageImage  = "image"
	MessageFile   = "file"
	MessageSystem = "system"
)

// User is an account that can log into the app or admin dashboard.
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"size:64;uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"size:128;not null" json:"-"`
	Nickname  string    `gorm:"size:64" json:"nickname"`
	Avatar    string    `gorm:"size:255" json:"avatar"`
	Email     string    `gorm:"size:128" json:"email"`
	Phone     string    `gorm:"size:32" json:"phone"`
	Role      string    `gorm:"size:16;default:user" json:"role"`
	Status    int       `gorm:"default:1" json:"status"` // 1=active 0=disabled
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Ban fields (V1). Banned marks the account as restricted; the optional
	// window [BanStart, BanEnd] limits when the ban is active.
	Banned    bool       `gorm:"default:0" json:"banned"`
	BanReason string     `gorm:"size:255" json:"ban_reason"`
	BanStart  *time.Time `json:"ban_start"`
	BanEnd    *time.Time `json:"ban_end"`

	Online bool `gorm:"-" json:"online"`
}

// IsBanned reports whether the account is actively banned at the given time.
// A ban with no start is active immediately; a ban with no end never expires.
func (u *User) IsBanned(now time.Time) bool {
	if !u.Banned {
		return false
	}
	if u.BanStart != nil && now.Before(*u.BanStart) {
		return false
	}
	if u.BanEnd != nil && now.After(*u.BanEnd) {
		return false
	}
	return true
}

// Friendship represents a directed contact relationship between two users.
type Friendship struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index:idx_user_friend,unique;not null" json:"user_id"`
	FriendID  uint      `gorm:"index:idx_user_friend,unique;not null" json:"friend_id"`
	Remark    string    `gorm:"size:64" json:"remark"`
	Status    int       `gorm:"default:1" json:"status"` // 1=accepted 0=pending
	CreatedAt time.Time `json:"created_at"`

	Friend *User `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
}

// Conversation is a private or group chat thread.
type Conversation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Type      string    `gorm:"size:16;not null" json:"type"`
	Name      string    `gorm:"size:128" json:"name"`
	Avatar    string    `gorm:"size:255" json:"avatar"`
	OwnerID   uint      `gorm:"index" json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Members []ConversationMember `gorm:"foreignKey:ConversationID" json:"members,omitempty"`
}

// ConversationMember links a user to a conversation.
type ConversationMember struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	ConversationID    uint      `gorm:"index:idx_conv_user,unique;not null" json:"conversation_id"`
	UserID            uint      `gorm:"index:idx_conv_user,unique;not null" json:"user_id"`
	Role              string    `gorm:"size:16;default:member" json:"role"`
	LastReadMessageID uint      `gorm:"default:0" json:"last_read_message_id"`
	JoinedAt          time.Time `gorm:"autoCreateTime" json:"joined_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Message is a single chat message inside a conversation.
type Message struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	ConversationID uint      `gorm:"index;not null" json:"conversation_id"`
	SenderID       uint      `gorm:"index;not null" json:"sender_id"`
	Type           string    `gorm:"size:16;default:text" json:"type"`
	Content        string    `gorm:"type:text" json:"content"`
	CreatedAt      time.Time `json:"created_at"`

	Sender *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

// SystemConfig stores arbitrary key/value site settings managed by admins.
type SystemConfig struct {
	Key       string    `gorm:"primaryKey;size:64" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}
