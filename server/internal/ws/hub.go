package ws

import (
	"encoding/json"
	"sync"
)

// Event types pushed to clients over the WebSocket.
const (
	EventMessage  = "message"
	EventPresence = "presence"
	EventRead     = "read"
	EventError    = "error"
)

// Envelope is the JSON frame exchanged over the socket.
type Envelope struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// OutEvent is a server-to-client event.
type OutEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Hub keeps track of connected clients and routes events to them.
type Hub struct {
	mu      sync.RWMutex
	clients map[uint]map[*Client]struct{} // userID -> set of connections

	register   chan *Client
	unregister chan *Client
}

// NewHub creates an initialized hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uint]map[*Client]struct{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run processes register/unregister events. Call it in its own goroutine.
func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			if h.clients[c.userID] == nil {
				h.clients[c.userID] = make(map[*Client]struct{})
			}
			h.clients[c.userID][c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if conns, ok := h.clients[c.userID]; ok {
				if _, ok := conns[c]; ok {
					delete(conns, c)
					close(c.send)
				}
				if len(conns) == 0 {
					delete(h.clients, c.userID)
				}
			}
			h.mu.Unlock()
		}
	}
}

// IsOnline reports whether a user has at least one active connection.
func (h *Hub) IsOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[userID]) > 0
}

// OnlineCount returns the number of currently connected users.
func (h *Hub) OnlineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// SendToUser delivers an event to every connection of the given user.
func (h *Hub) SendToUser(userID uint, event OutEvent) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.mu.RLock()
	conns := h.clients[userID]
	targets := make([]*Client, 0, len(conns))
	for c := range conns {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- payload:
		default:
			// Drop slow consumers to protect the hub.
		}
	}
}

// SendToUsers delivers an event to a list of users.
func (h *Hub) SendToUsers(userIDs []uint, event OutEvent) {
	for _, id := range userIDs {
		h.SendToUser(id, event)
	}
}
