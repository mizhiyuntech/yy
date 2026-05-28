package ws

import (
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
)

// InboundHandler is invoked for every frame received from a client.
type InboundHandler func(c *Client, env Envelope)

// Client is a single WebSocket connection belonging to a user.
type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	userID  uint
	onFrame InboundHandler
}

// NewClient wraps a websocket connection for the given user.
func NewClient(hub *Hub, conn *websocket.Conn, userID uint, onFrame InboundHandler) *Client {
	return &Client{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 64),
		userID:  userID,
		onFrame: onFrame,
	}
}

// UserID returns the owner of the connection.
func (c *Client) UserID() uint { return c.userID }

// Start registers the client and launches its read and write pumps.
func (c *Client) Start() {
	c.hub.register <- c
	go c.writePump()
	go c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var env Envelope
		if err := c.conn.ReadJSON(&env); err != nil {
			break
		}
		if c.onFrame != nil {
			c.onFrame(c, env)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
