/**
 * ALL-IN-ONE REAL-TIME LAN SYSTEM (TEST VERSION - NO POSTGRES)
 * warning this is an ai generated  code for reference purposes
 * -------------------------------
 * This script runs both the Main Server (Port 3000) and Admin Server (Port 4000).
 * It uses in-memory storage for testing purposes.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// Current Global State (What the website looks like right now)
let currentGlobalHTML = `
    <div class="initial-state">
        <h1 style="color: #444; font-family: sans-serif; text-align: center; margin-top: 50px;">
            Waiting for Admin to push content...
        </h1>
        <p style="text-align: center; color: #666;">The main site is ready and listening for commands.</p>
    </div>
`;

// Map to track active user connections for the Kick feature
// Key: socketId, Value: { socket, ip }
const userConnections = new Map();

// ==========================================
// 1. MAIN SERVER (PORT 3000) - For 50+ Users
// ==========================================
const mainServer = http.createServer((req, res) => {
  // Serve static assets (Images, CSS, etc.) from an 'assets' folder
  if (req.url.startsWith("/assets/")) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("Asset not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {};
      res.writeHead(200, { "Content-Type": mimeMap[ext] || "text/plain" });
      res.end(content);
    });
    return;
  }

  // Serve the Main Website HTML
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(getMainHTML());
});

const userWss = new WebSocket.Server({ server: mainServer });

userWss.on("connection", (ws, req) => {
  // Extract User Info
  const ip = req.socket.remoteAddress.replace(/^.*:/, "") || "0.0.0.0";
  const socketId = `user_${Math.random().toString(36).substr(2, 9)}`;
   
  // Store in Map for real-time kicking and tracking
  userConnections.set(socketId, { socket: ws, ip: ip });

  console.log(`User connected: ${socketId} (${ip})`);
  console.log(req);
  // Immediately sync new user with current site state
  ws.send(JSON.stringify({ type: "UPDATE_CONTENT", html: currentGlobalHTML }));

  // Notify Admin of new connection
  broadcastToAdmin({ type: "USER_JOINED", id: socketId, ip: ip });

  ws.on("close", () => {
    console.log(`User disconnected: ${socketId}`);
    userConnections.delete(socketId);
    broadcastToAdmin({ type: "USER_LEFT", id: socketId });
  });

  ws.on("error", (err) => {
    console.error(`Socket error for ${socketId}:`, err);
  });
});

mainServer.listen(2026, "0.0.0.0", () => {
  console.log("✅ Main Server active: http://localhost:2026");
  console.log(
    "👉 Users on LAN should use your local IP (e.g., http://192.168.x.x:2026)"
  );
});

// ==========================================
// 2. ADMIN SERVER (PORT 4000) - Local Only
// ==========================================
const adminServer = http.createServer((req, res) => {
  // Secure check: Only allow access from localhost
  const ip = req.socket.remoteAddress;
  if (ip !== "127.0.0.1" && ip !== "::1") {
    res.writeHead(403);
    res.end("Access Denied: Admin is restricted to Localhost.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(getAdminHTML());
});

const adminWss = new WebSocket.Server({ server: adminServer });

adminWss.on("connection", (ws) => {
  console.log("Admin connected to dashboard");

  // Sync current user list to the admin dashboard on load
  userConnections.forEach((data, id) => {
    ws.send(JSON.stringify({ type: "USER_JOINED", id: id, ip: data.ip }));
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // Command: Change the Website Content
      if (data.type === "PUSH_CONTENT") {
        currentGlobalHTML = data.html;
        broadcastToUsers({ type: "UPDATE_CONTENT", html: data.html });
        console.log("Admin pushed new content update");
      }

      // Command: Kick User
      if (data.type === "KICK_USER") {
        const connection = userConnections.get(data.targetId);
        if (connection && connection.socket) {
          connection.socket.send(
            JSON.stringify({
              type: "FORCE_EXIT",
              message: "Connection terminated by Administrator.",
            })
          );
          connection.socket.terminate();
          userConnections.delete(data.targetId);
          console.log(`Admin kicked user: ${data.targetId}`);
        }
      }
    } catch (e) {
      console.error("Invalid message from admin:", e);
    }
  });
});

adminServer.listen(4000, "127.0.0.1", () => {
  console.log("🔒 Admin Server active: http://localhost:4000");
});

// ==========================================
// 3. HELPER FUNCTIONS (Broadcasting)
// ==========================================

function broadcastToUsers(data) {
  const msg = JSON.stringify(data);
  userWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function broadcastToAdmin(data) {
  const msg = JSON.stringify(data);
  adminWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ==========================================
// 4. THE FRONT-END TEMPLATES
// ==========================================

function getMainHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Display</title>
        <style>
            * { box-sizing: border-box; }
            body { 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f0f2f5;
                color: #1c1e21;
                height: 100vh;
                overflow: hidden;
            }
            #content-container { 
                height: 100%;
                width: 100%;
                overflow-y: auto;
                transition: opacity 0.5s ease;
            }
            .kicked-overlay { 
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.95); color: white; display: none; 
                flex-direction: column; align-items: center; justify-content: center; z-index: 9999;
                text-align: center;
            }
            .kicked-overlay h1 { font-size: 3rem; margin-bottom: 10px; color: #ff4d4d; }
        </style>
    </head>
    <body>
        <div id="content-container"></div>
        <div id="kicked" class="kicked-overlay">
            <h1>ACCESS DENIED</h1>
            <p id="reason" style="font-size: 1.2rem;"></p>
            <p style="margin-top: 20px; color: #888;">Contact system administrator for help.</p>
        </div>

        <script>
            const socket = new WebSocket('ws://' + location.host);
            const container = document.getElementById('content-container');
            
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'UPDATE_CONTENT') {
                    container.style.opacity = '0';
                    setTimeout(() => {
                        container.innerHTML = data.html;
                        container.style.opacity = '1';
                    }, 300);
                }
                
                if (data.type === 'FORCE_EXIT') {
                    document.getElementById('kicked').style.display = 'flex';
                    document.getElementById('reason').innerText = data.message;
                    socket.close();
                }
            };

            socket.onclose = () => {
                console.log("Connection to server closed.");
            };

            // ANTI-INSPECT SECURITY
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.onkeydown = (e) => {
                // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
                if (e.keyCode === 123 || 
                    (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                    (e.ctrlKey && e.keyCode === 85)) {
                    return false;
                }
            };
        </script>
    </body>
    </html>`;
}

function getAdminHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Admin Command Center</title>
        <style>
            body { font-family: sans-serif; display: flex; height: 100vh; margin: 0; background: #1a1a1a; color: #eee; }
            .panel { flex: 1; padding: 25px; border-right: 1px solid #333; display: flex; flex-direction: column; }
            h2 { margin-top: 0; color: #4dabf7; border-bottom: 1px solid #333; padding-bottom: 10px; }
            
            textarea { 
                width: 100%; 
                flex-grow: 1; 
                background: #2a2a2a; 
                color: #fff; 
                border: 1px solid #444; 
                padding: 15px; 
                font-family: monospace; 
                border-radius: 4px;
                resize: none;
                margin-bottom: 15px;
            }
            
            .controls { display: flex; gap: 10px; margin-bottom: 20px; }
            button { 
                cursor: pointer; padding: 12px 20px; border: none; border-radius: 4px; 
                font-weight: bold; transition: filter 0.2s;
            }
            button:hover { filter: brightness(1.2); }
            
            .btn-push { background: #228be6; color: white; flex: 2; }
            .btn-clear { background: #fa5252; color: white; flex: 1; }
            
            #userList { overflow-y: auto; flex-grow: 1; }
            .user-row { 
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px; background: #2a2a2a; margin-bottom: 8px; 
                border-radius: 4px; border-left: 4px solid #4dabf7;
            }
            .user-info { display: flex; flex-direction: column; }
            .user-id { font-size: 0.8rem; color: #888; }
            .user-ip { font-weight: bold; }
            
            .btn-kick { background: #e03131; color: white; padding: 6px 12px; font-size: 0.8rem; }
            
            .status-bar { padding: 10px; font-size: 0.9rem; color: #888; border-top: 1px solid #333; }
        </style>
    </head>
    <body>
        <div class="panel">
            <h2>Content Controller</h2>
            <textarea id="htmlInput" placeholder="Paste HTML/CSS code here to update the main site..."></textarea>
            <div class="controls">
                <button class="btn-push" onclick="pushContent()">🚀 PUSH UPDATE</button>
                <button class="btn-clear" onclick="clearInput()">CLEAR</button>
            </div>
            <h3>Quick Actions</h3>
            <div style="display: flex; gap: 10px;">
                <button style="background: #444; color: white;" onclick="setPreset('red')">Emergency Alert</button>
                <button style="background: #444; color: white;" onclick="setPreset('welcome')">Welcome Screen</button>
            </div>
        </div>
        
        <div class="panel" style="max-width: 400px;">
            <h2>Live Users <h1 id="a1">0</h1></h2>
            <div id="userList"></div>
            <div class="status-bar" id="status">System Ready</div>
        </div>

        <script> 
            const count=document.getElementById('a1');
            var c=0;
            const socket = new WebSocket('ws://localhost:4000');
            const userList = document.getElementById('userList');
            const htmlInput = document.getElementById('htmlInput');
            function pushContent() {
                const html = htmlInput.value;
                if(!html.trim()) return;
                socket.send(JSON.stringify({ type: 'PUSH_CONTENT', html: html }));
                updateStatus("Update pushed to all users.");
            }

            function clearInput() { htmlInput.value = ''; }

            function kickUser(id) {
                if(confirm("Kick user " + id + "?")) {
                    socket.send(JSON.stringify({ type: 'KICK_USER', targetId: id }));
                }
            }

            function updateStatus(msg) {
                document.getElementById('status').innerText = msg;
                setTimeout(() => document.getElementById('status').innerText = "System Ready", 2026);
            }

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'USER_JOINED') {
                    if (document.getElementById(data.id)) return;
                    const div = document.createElement('div');
                    div.id = data.id;
                    div.className = 'user-row';
                    div.innerHTML = \`
                        <div class="user-info">
                            <span class="user-ip">\${data.ip}</span>
                            <span class="user-id">\${data.id}</span>
                        </div>
                        <button class="btn-kick" onclick="kickUser('\${data.id}')">KICK</button>
                    \`;
                    userList.appendChild(div);
                    c+=1;
                    count.innerHTML=c;
                    
                }

                if (data.type === 'USER_LEFT') {
                    document.getElementById(data.id)?.remove();
                    c-=1;
                    count.innerHTML=c;

                }
            };

            function setPreset(type) {
                if(type === 'red') {
                    htmlInput.value = '<div style="background: #e03131; color: white; height: 100vh; display: flex; align-items: center; justify-content: center; font-size: 5rem;">⚠️ ATTENTION REQUIRED</div>';
                } else if(type === 'welcome') {
                    htmlInput.value = '<div style="text-align: center; padding-top: 100px;"><h1>Welcome to the Presentation</h1><p>Please wait for instructions.</p></div>';
                }
                pushContent();
            }
        </script>
    </body>
    </html>`;
}
