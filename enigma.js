import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { submit1, submit2, leaderboard } from "./db_server.js";


const port = 2026;
console.clear();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RED = "\x1b[92m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";
const userConnections = new Map();
const art = `
${DIM}${RED}${BRIGHT}╭───────────────────────────────────────────────────╮${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}███████╗███╗   ██╗██╗ ██████╗ ███╗   ███╗ █████╗ ${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}██╔════╝████╗  ██║██║██╔════╝ ████╗ ████║██╔══██╗${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}█████╗  ██╔██╗ ██║██║██║  ███╗██╔████╔██║███████║${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}██╔══╝  ██║╚██╗██║██║██║   ██║██║╚██╔╝██║██╔══██║${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}███████╗██║ ╚████║██║╚██████╔╝██║ ╚═╝ ██║██║  ██║${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}      A Reverse prompting event conducted by     ${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}                 THE TROJANS                     ${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}│${RESET} ${RED}${BRIGHT}      The symposium of the department of IT      ${RESET} ${DIM}${RED}${BRIGHT}│${RESET}
${DIM}${RED}${BRIGHT}╰───────────────────────────────────────────────────╯${RESET}
`;
console.log(art);
console.log(`
> enigma admin@1.0.0 start
> node enigma.js
`);


const GREEN_BRIGHT = "\x1b[38;5;46m";
const GREEN_DIM = "\x1b[38;5;28m";

function renderStaticTUI() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  // 1. Prepare the Art (Stripping existing ANSI to recalculate centering)
  const cleanArtLines = art.split('\n').map(line => 
    line.replace(/\x1b\[[0-9;]*m/g, "")
  ).filter(l => l.trim().length > 0);

  const artWidth = Math.max(...cleanArtLines.map(l => l.length));
  const artHeight = cleanArtLines.length;

  // 2. Calculate Offsets
  const xOffset = Math.max(0, Math.floor((cols - artWidth) / 2));
  const yOffset = Math.max(0, Math.floor((rows - artHeight) / 3)); // Positioned in upper third

  // 3. Clear Screen
  process.stdout.write("\x1b[2J\x1b[H");

  // 4. Draw Centered Art
  cleanArtLines.forEach((line, i) => {
    process.stdout.write(`\x1b[${yOffset + i};${xOffset}H${GREEN_BRIGHT}${BRIGHT}${line}${RESET}`);
  });

  // 5. Draw Info Box (Below Art)
  const infoY = yOffset + artHeight + 2;
  const infoText = `  SERVER: ONLINE  |  PORT: ${port}  |  V1.0  `;
  const infoX = Math.max(0, Math.floor((cols - infoText.length) / 2));
  
  process.stdout.write(`\x1b[${infoY};${infoX}H${GREEN_DIM}${infoText}${RESET}`);

  // 6. Draw Horizontal Divider for Logs
  const dividerY = infoY + 2;
  process.stdout.write(`\x1b[${dividerY};1H${DIM}${"─".repeat(cols)}${RESET}`);
  
  // Move cursor to bottom of divider so future logs appear below
  process.stdout.write(`\x1b[${dividerY + 1};1H`);
  console.log(`${DIM}System logs initialized...${RESET}`);
}

// Initial Render
renderStaticTUI();

// Re-render only if the user changes their window size
process.stdout.on('resize', () => {
  renderStaticTUI();
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

const lobby=openfile("pages/lobby.html")
const r1=openfile("pages/text.html")
const r2=openfile("pages/img.html")
const ci=openfile("pages/admin.html")
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
        broadcast_to_user(lobby,"lobby");
      }
      if(msg.data==="round1"){
        console.log(r1);
        broadcast_to_user(r1,"r1");
      }
      if(msg.data==="round2"){
        console.log(r2);
        broadcast_to_user(r2,"r2");
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

function broadcast_to_user(htmlContent,f) {
  currentGlobalHTML = htmlContent; // Save state for new joiners
  const payload = JSON.stringify({ type: "UPDATE_CONTENT", html: htmlContent ,screen:f});
  
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
  console.log("> at localhost:4000/");
  console.log("> at https://hyper.local:4000/");
});


function getMainHTML() {
  const layout=openfile("pages/layout.html");
  return layout; 
}



const db_server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/JSON" });
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end',async()=>{
        try{
        const { action, name, ip, qno, submission, tablename } = JSON.parse(body);
        if (action === "submit1") {
            await submit1(name, ip, qno, submission);
            res.end(JSON.stringify({ status: "success", message: "Submission recorded for Round 1",score:""}));
        } else if (action === "submit2") {
            await submit2(name, ip, qno, submission);
            res.end(JSON.stringify({ status: "success", message: "Submission recorded for Round 2.", score:""}));    
        } else if (action === "leaderboard") {
            const data = await leaderboard(tablename);
            res.end(JSON.stringify({ status: "success", data }));
        }}
        catch(err){
            console.error("Request Error:", err);
            res.end(JSON.stringify({ status: "error", message: err.message }));
        }
    }) 
});



db_server.listen(1212,() => {
  console.log("Database connected and ready.");
});