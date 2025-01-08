const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Advanced state management with optimized memory patterns
const StateManager = {
  users: new Map(),
  messages: [],
  MAX_MESSAGES: 100,
  
  addMessage(message) {
    this.messages = [...this.messages.slice(-(this.MAX_MESSAGES - 1)), message];
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

// Serve index.html directly from root
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Afizzt - Global Chat</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='80' font-size='80'>⚡</text></svg>">
    <style>
        :root {
            --primary: #6d28d9;
            --primary-dark: #5b21b6;
            --secondary: #10b981;
            --background: #1e293b;
            --surface: #334155;
            --text: #f8fafc;
            --text-secondary: #cbd5e1;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: system-ui, -apple-system, sans-serif;
        }

        body {
            background: var(--background);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
        }

        .container {
            width: 100%;
            max-width: 900px;
            height: 90vh;
            background: var(--surface);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .auth-portal {
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
        }

        .logo {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(to right, #fff, #f0f0f0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }

        .input-wrapper {
            width: 100%;
            max-width: 320px;
            position: relative;
        }

        input {
            width: 100%;
            padding: 1rem;
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            background: rgba(255,255,255,0.1);
            color: var(--text);
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        input:focus {
            outline: none;
            border-color: rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.15);
        }

        input::placeholder {
            color: rgba(255,255,255,0.6);
        }

        .button {
            background: rgba(255,255,255,0.1);
            color: var(--text);
            border: none;
            padding: 1rem 2.5rem;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid rgba(255,255,255,0.1);
        }

        .button:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
        }

        .chat-container {
            display: none;
            flex-direction: column;
            height: 100%;
        }

        .chat-header {
            padding: 1rem 1.5rem;
            background: var(--primary);
            color: var(--text);
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }

        .messages {
            flex-grow: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }

        .message {
            padding: 0.8rem 1rem;
            border-radius: 12px;
            max-width: 80%;
            word-break: break-word;
            animation: fadeIn 0.3s ease forwards;
            opacity: 0;
            transform: translateY(10px);
        }

        @keyframes fadeIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.received {
            background: var(--primary);
            align-self: flex-start;
        }

        .message.sent {
            background: var(--secondary);
            align-self: flex-end;
        }

        .message.system {
            background: rgba(255,255,255,0.1);
            align-self: center;
            font-style: italic;
            font-size: 0.9rem;
        }

        .message .author {
            font-size: 0.8rem;
            opacity: 0.8;
            margin-bottom: 0.3rem;
            font-weight: 500;
        }

        .input-area {
            padding: 1rem;
            display: flex;
            gap: 0.8rem;
            background: var(--surface);
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        #online-count {
            background: rgba(255,255,255,0.1);
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            font-size: 0.9rem;
        }

        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="auth-portal" id="auth-portal">
            <div class="logo">⚡ Afizzt</div>
            <div class="input-wrapper">
                <input type="text" id="username-input" placeholder="NAME..." maxlength="20" />
            </div>
            <button class="button" id="join-btn">Enter Chatroom</button>
        </div>

        <div class="chat-container" id="chat-container">
            <div class="chat-header">
                <span id="username-display"></span>
                <span id="online-count">Online: 0</span>
            </div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="message-input" placeholder="Type a message..." maxlength="500" />
                <button class="button" id="send-btn">Send</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        // State management using proxy-based reactive system
        const State = new Proxy({
            username: '',
            isAuthenticated: false,
            messages: [],
            onlineCount: 0
        }, {
            set(target, key, value) {
                target[key] = value;
                requestAnimationFrame(render);
                return true;
            }
        });

        // DOM elements
        const elements = {
            authPortal: document.getElementById('auth-portal'),
            chatContainer: document.getElementById('chat-container'),
            usernameInput: document.getElementById('username-input'),
            joinBtn: document.getElementById('join-btn'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            messages: document.getElementById('messages'),
            usernameDisplay: document.getElementById('username-display'),
            onlineCount: document.getElementById('online-count')
        };

        // Initialize socket connection
        const socket = io();

        // Event handlers
        elements.joinBtn.addEventListener('click', handleJoin);
        elements.sendBtn.addEventListener('click', handleSend);
        elements.messageInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleSend();
        });
        elements.usernameInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleJoin();
        });

        // Socket event listeners
        socket.on('connect', () => console.log('Connected to server'));
        
        socket.on('message', message => {
            State.messages = [...State.messages, message];
            requestAnimationFrame(scrollToBottom);
        });

        socket.on('userCount', count => {
            State.onlineCount = count;
        });

        // Handler functions
        function handleJoin() {
            const username = elements.usernameInput.value.trim();
            if (username) {
                State.username = username;
                State.isAuthenticated = true;
                socket.emit('join', username);
                elements.usernameDisplay.textContent = \`User: \${username}\`;
            }
        }

        function handleSend() {
            const content = elements.messageInput.value.trim();
            if (content) {
                socket.emit('message', {
                    author: State.username,
                    content
                });
                elements.messageInput.value = '';
            }
        }

        // Rendering functions
        function render() {
            elements.authPortal.style.display = State.isAuthenticated ? 'none' : 'flex';
            elements.chatContainer.style.display = State.isAuthenticated ? 'flex' : 'none';
            elements.onlineCount.textContent = \`Online: \${State.onlineCount}\`;
            
            renderMessages();
        }

        function renderMessages() {
            elements.messages.innerHTML = State.messages
                .map(msg => {
                    const messageType = msg.type === 'system' ? 'system' : 
                                      msg.author === State.username ? 'sent' : 'received';
                    return \`
                        <div class="message \${messageType}">
                            \${messageType !== 'system' ? \`<div class="author">\${msg.author}</div>\` : ''}
                            <div class="content">\${escapeHTML(msg.content)}</div>
                        </div>
                    \`;
                })
                .join('');
        }

        // Utility functions
        function scrollToBottom() {
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }

        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    </script>
</body>
</html>`);
});

// Socket event handlers
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
