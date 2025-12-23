import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const port = 2026;
console.clear();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RED = "\x1b[91m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";

const art = `
${DIM}_____________________________________________________${RESET}
${DIM}|${RESET}                                                   ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}███████╗███╗   ██╗██╗ ██████╗ ███╗   ███╗ █████╗ ${RESET} ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}██╔════╝████╗  ██║██║██╔════╝ ████╗ ████║██╔══██╗${RESET} ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}█████╗  ██╔██╗ ██║██║██║  ███╗██╔████╔██║███████║${RESET} ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}██╔══╝  ██║╚██╗██║██║██║   ██║██║╚██╔╝██║██╔══██║${RESET} ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}███████╗██║ ╚████║██║╚██████╔╝██║ ╚═╝ ██║██║  ██║${RESET} ${DIM}|${RESET}
${DIM}|${RESET} ${RED}${BRIGHT}╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝${RESET} ${DIM}|${RESET}
${DIM}_____________________________________________________${RESET}
`;
console.log(art);
console.log(`
> enigma admin@1.0.0 start
> node enigma.js
`);

const service = http.createServer((req, res) => {
  res.end("hello");
});

service.listen(port, () => {
  console.log("> at https://localhost:" + port + "/");
  console.log("> at https://hyper.local:" + port + "/");
});

const alpha = http.createServer((req, res) => {
  if (req.url.startsWith("/assets/")) {
    const filepath = path.join(__dirname, req.url);
    fs.readFile(filepath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("asset not found");
        return;
      }
      const ext = path.extname(filepath).toLowerCase();
      const mimeMap = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".css": "text/css",
        ".js": "application/javascript",
      };
      const contentType = mimeMap[ext] || "text/plain";
      res.end(content);
    });
}
    if (req.url.startsWith("/user/")) {
      fs.readFile(path.join(__dirname, "user.html"), (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("Error loading index.html");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        }
      });
    }
    return;
  
});

/*-------------- USER WEBSOCKET SERVICE --------------*/

const userwss= new WebSocket.Server({server:alpha});

userwss.on('connection',(ws,req)=>{
  const ip=req.socket.remoteAddress.replace(/^.*/,"")||"0.0.0.0";
  const socketId = `user_${Math.random().toString(36).substr(2, 9)}`
  userConnections.set(socketId, { socket: ws, ip: ip });

  console.log(`User connected: ${socketId} (${ip})`);

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
})



/*-------------- ADMIN WEBSOCKET SERVICE --------------*/


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



alpha.listen(2026, "0.0.0.0", () => {
  console.log("alpha server is ready");
});


beta.listen(4753,"0.0.0.0",()=>{
  console.log("beta server is ready")
})


const beta=http.createServer((req,res)=>{
  
})