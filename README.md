# 🔐 ENIGMA - Reverse Prompting Event Platform

A WebSocket-based real-time event management system for conducting reverse prompting competitions. Built by **THE TROJANS** for the IT Department Symposium.

## 🚀 Features

- **Real-time WebSocket Communication** - Instant sync between admin and participants
- **Session Password Protection** - Control access with dynamic session passwords
- **API Load Balancing** - Distribute AI scoring requests across multiple endpoints
- **Admin Control Panel** - Full event management dashboard
- **Multi-Round Support** - Lobby, Text Round (R1), and Image Round (R2)
- **Live Leaderboard** - Real-time score tracking
- **User Management** - Kick, track, and monitor participants

## 📦 Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
# or
npm run enigma
```

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t enigma .

# Run the container
docker run -d -p 2026:2026 -p 4000:4000 -p 1212:1212 --name enigma-server enigma
```

## 🌐 Access Points

| Service | Port | URL |
|---------|------|-----|
| Main Event (Users) | 2026 | `http://localhost:2026` |
| Admin Panel | 4000 | `http://localhost:4000` |
| Database API | 1212 | `http://localhost:1212` |

## 🔧 Configuration

### API Load Balancer

Add API endpoints via the Admin Panel or edit `config.js`:

```javascript
export const defaultApiEndpoints = [
    {
        name: "Groq Primary",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: "your-api-key",
        weight: 1,
        model: "llama-3.3-70b-versatile"
    }
];
```

### Session Management

- Set session passwords from the Admin Panel
- Toggle session active/inactive state
- Monitor connected and authenticated users

## 🎮 Admin Panel Features

1. **Round Controls** - Switch between Lobby, Round 1, and Round 2
2. **Session Management** - Set/clear passwords, toggle sessions
3. **Live Statistics** - Connected users, authenticated users, uptime
4. **API Load Balancer** - Add/remove API endpoints, monitor health
5. **User Management** - View connected users, kick participants
6. **Activity Log** - Real-time event logging

## 📡 WebSocket Events

### Client → Server

| Event | Description |
|-------|-------------|
| `AUTH` | Authenticate with name and password |
| `SUBMIT` | Submit answer for scoring |
| `GET_LEADERBOARD` | Request leaderboard data |

### Server → Client

| Event | Description |
|-------|-------------|
| `AUTH_REQUIRED` | Password authentication required |
| `AUTH_SUCCESS` | Authentication successful |
| `AUTH_FAILED` | Authentication failed |
| `UPDATE_CONTENT` | Screen/round change |
| `SUBMIT_SUCCESS` | Submission accepted |
| `LEADERBOARD` | Leaderboard data |
| `FORCE_EXIT` | User kicked |

## 🗄️ Database Requirements

PostgreSQL database with the following:
- Tables: `r1`, `r2` (for submissions)
- Stored Procedures: `SUBMIT1`, `SUBMIT2`
- Function: `get_leaderboard`

## 📁 Project Structure

```
ENIGMA/
├── enigma.js          # Main server
├── db_server.js       # Database & API handlers
├── data.js            # Questions data
├── config.js          # Configuration
├── package.json
├── Dockerfile
├── assets/
│   ├── codex.js       # Client-side logic
│   └── images...
└── pages/
    ├── layout.html    # Main wrapper
    ├── admin.html     # Admin panel
    ├── lobby.html     # Lobby screen
    ├── text.html      # Round 1
    ├── img.html       # Round 2
    └── credits.html
```

## 🔒 Security

- Anti-inspect measures (disabled dev tools shortcuts)
- Session-based authentication
- IP tracking for all connections
- Admin kick functionality

## 📝 License

ISC - THE TROJANS