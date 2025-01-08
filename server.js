const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const StateManager = {
  users: new Map(),
  messages: [],
  MAX_MESSAGES: 100,
  
  addMessage(message) {
    this.messages.push(message);
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }
    return message;
  },
  
  addUser(id, username) {
    this.users.set(id, {
      username,
      lastActive: Date.now(),
      sessionId: Math.random().toString(36)
    });
    return this.getUserCount();
  },
  
  removeUser(id) {
    const user = this.users.get(id);
    this.users.delete(id);
    return user;
  },
  
  getUserCount() {
    return this.users.size;
  }
};

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('➕ Client connected:', socket.id);

  socket.on('join', (username) => {
    const userCount = StateManager.addUser(socket.id, username);
    io.emit('userCount', userCount);
    StateManager.messages.forEach(msg => socket.emit('message', msg));
    
    const joinMessage = {
      id: `${Date.now()}-${Math.random().toString(36)}`,
      author: 'System',
      content: `${username} has joined Afizzt`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    io.emit('message', joinMessage);
  });

  socket.on('message', (message) => {
    if (!message?.content?.trim()) return;

    const enhancedMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36)}`,
      timestamp: new Date().toISOString()
    };

    StateManager.addMessage(enhancedMessage);
    io.emit('message', enhancedMessage);
  });

  socket.on('disconnect', () => {
    const user = StateManager.removeUser(socket.id);
    if (user) {
      io.emit('userCount', StateManager.getUserCount());
      io.emit('message', {
        id: `${Date.now()}-${Math.random().toString(36)}`,
        author: 'System',
        content: `${user.username} has left Afizzt`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    }
  });
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`🚀 Afizzt server running on port ${port}`);
});
