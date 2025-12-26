import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer } from "ws";

const port = 2026;
console.clear();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RED = "\x1b[91m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";
const userConnections = new Map();
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
  else{
    res.end(getMainHTML());
  }
});


alpha.listen(2026,'0.0.0.0',()=>{
  console.log("server in https://localhost:2026/");
  console.log("> at https://hyper.local:2026/");
})


const openfile=(input)=>{
  try {
    // readFileSync stops execution until the file is read, returning the content
    return fs.readFileSync(path.join(__dirname, input), "utf8");
  } catch (err) {
    console.log("error fetching " + input);
    return ""; 
  }
}

const lobby=openfile("lobby.html")
const r1=openfile("text.html")
const r2=openfile("img.html")
const ci=openfile("admin.html")
let currentGlobalHTML = lobby;



const beta = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(ci);
});


/* admin websocket */
const admin=new WebSocketServer({server:beta});

admin.on("connection",(ws)=>{
  ws.on('message',(message)=>{
     const msg=JSON.parse(message);
     if(msg.type==="cs"){
      if(msg.data==="lobby"){
        console.log(lobby);
        broadcast_to_user(lobby);
      }
      if(msg.data==="round1"){
        console.log(r1);
        broadcast_to_user(r1);
      }
      if(msg.data==="round2"){
        console.log(r2);
        broadcast_to_user(r2);
      }
      console.log(msg);
     }
  });
});


/* user websocket */
/*
const user=new WebSocketServer({server:alpha});

user.on("connection",(ws)=>{

  ws.on('message',(message)=>{
    console.log(JSON.parse(message));
  })
})*/


const userWss = new WebSocketServer({ server: alpha });

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


  ws.on("close", () => {
    console.log(`User disconnected: ${socketId}`);
    userConnections.delete(socketId);
    broadcastToAdmin({ type: "USER_LEFT", id: socketId });
  });

  ws.on("error", (err) => {
    console.error(`Socket error for ${socketId}:`, err);
  });
});

function broadcast_to_user(htmlContent) {
  currentGlobalHTML = htmlContent; // Save state for new joiners
  const payload = JSON.stringify({ type: "UPDATE_CONTENT", html: htmlContent });
  
  userWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastToAdmin(data) {
  admin.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/* Helper function */


beta.listen(4000, () => {
  console.log("> at https://localhost:4000/");
  console.log("> at https://hyper.local:4000/");
});

const main=openfile("")

function getMainHTML() {
  const layout=openfile("layout.html");
  return layout; 
}