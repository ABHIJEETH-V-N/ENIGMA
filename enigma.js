import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { config } from 'dotenv';
import { submit1, submit2, leaderboard, getSessionState, updateSessionState, addApiEndpoint, removeApiEndpoint, apiEndpoints, r1_questions, r2_questions } from "./db_server.js";

// Load environment variables
config();

// ============ ADMIN SECURITY ============
const ADMIN_SECRET = process.env.ADMIN_SECRET || "enigma2026admin";
const adminAuthenticated = new Set(); // Track authenticated admin connections

// ============ IMAGE PRELOADING ============
// Preload Round 2 images into memory at startup (prevents slow loading during event)
const preloadedImages = new Map();
const PROTECTED_IMAGES = ['apple.png', 'cat.png', 'chair.png', 'brain.png', 'coffee.png', 'food.png']; // Round 2 images - add more as needed

function preloadImages() {
  console.log("Preloading Round 2 images into memory...");
  const assetsDir = path.join(__dirname, 'assets');
  
  PROTECTED_IMAGES.forEach(filename => {
    const filepath = path.join(assetsDir, filename);
    try {
      const content = fs.readFileSync(filepath);
      preloadedImages.set(filename, content);
      console.log(`  ✓ Preloaded: ${filename} (${(content.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`  ✗ Failed to preload: ${filename}`);
    }
  });
  
  console.log(`Preloaded ${preloadedImages.size}/${PROTECTED_IMAGES.length} images`);
}


const port = parseInt(process.env.USER_PORT) || 2026;
console.clear();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RED = "\x1b[92m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";
const userConnections = new Map();
const authenticatedUsers = new Map(); // Track authenticated users
// Preload images at startup


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

console.log(`
> enigma admin@1.0.0 start
> node enigma.js
`);
preloadImages();



// Re-render only if the user changes their window size
process.stdout.on('resize', () => {
  renderStaticTUI();
});

const alpha = http.createServer((req, res) => {
  if (req.url.startsWith("/assets/")) {
    const filename = path.basename(req.url);
    const filepath = path.join(__dirname, req.url);
    const ext = path.extname(filepath).toLowerCase();
    
    // Check if this is a protected Round 2 image
    if (PROTECTED_IMAGES.includes(filename)) {
      const state = getSessionState();
      // Only serve protected images during Round 2 or later rounds
      if (state.currentRound !== 'r2' && state.currentRound !== 'round2' && 
          state.currentRound !== 'waiting2' && state.currentRound !== 'credits') {
        res.writeHead(403);
        res.end("Access denied - Round 2 not started");
        return;
      }
      
      // Serve from preloaded cache (fast!)
      if (preloadedImages.has(filename)) {
        const mimeMap = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
        };
        res.writeHead(200, { "Content-Type": mimeMap[ext] || "image/png" });
        res.end(preloadedImages.get(filename));
        return;
      }
    }
    
    // Non-protected assets (codex.js, bg.jpg, etc.) - serve normally
    fs.readFile(filepath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("asset not found");
        return;
      }
      const mimeMap = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".css": "text/css",
        ".js": "application/javascript",
      };
      const contentType = mimeMap[ext] || "text/plain";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  }
  else{
    res.end(getMainHTML());
  }
});


alpha.listen(2026,'0.0.0.0',()=>{
  console.log("> User server alpha is successfully running.");
  console.log(`> User access at ${RED}http://localhost:2026/${RESET}`);
  console.log(`user can access at ${RED}http://<your-ip-address>:2026/${RESET}`);
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
const waiting=openfile("pages/waiting.html")
let currentGlobalHTML = lobby;



const beta = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(ci);
});


/* admin websocket */
const admin=new WebSocketServer({server:beta});

admin.on("connection",(ws)=>{
  console.log("Admin connection attempt");
  const adminId = `admin_${Math.random().toString(36).substr(2, 9)}`;
  ws.adminId = adminId;
  
  // Require authentication first
  ws.send(JSON.stringify({ type: "AUTH_REQUIRED" }));

  ws.on('message',(message)=>{
     const msg=JSON.parse(message);
     
     // Handle admin authentication
     if(msg.type === "ADMIN_AUTH") {
       if(msg.password === ADMIN_SECRET) {
         adminAuthenticated.add(adminId);
         console.log("Admin authenticated successfully");
         ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }));
         
         // Send current state on successful auth
         const state = getSessionState();
         ws.send(JSON.stringify({ 
           type: "STATE_SYNC", 
           data: {
             currentRound: state.currentRound,
             password: state.password,
             isActive: state.isActive,
             topN: state.topN || 10,
             showNamesOnLeaderboard: state.showNamesOnLeaderboard || false,
             r1Questions: state.r1Questions,
             r2Questions: state.r2Questions,
             connectedUsers: userConnections.size,
             authenticatedUsers: authenticatedUsers.size,
             apiEndpoints: apiEndpoints.map(ep => ({ url: ep.url, failures: ep.failures, weight: ep.weight }))
           }
         }));
         
         // Send current user list
         sendUserListToAdmin();
       } else {
         console.log("Admin auth failed - wrong password");
         ws.send(JSON.stringify({ type: "AUTH_FAILED", message: "Invalid admin credentials" }));
       }
       return;
     }
     
     // All other commands require authentication
     if(!adminAuthenticated.has(adminId)) {
       ws.send(JSON.stringify({ type: "ERROR", message: "Not authenticated" }));
       return;
     }
     
     // Change screen/round
     if(msg.type==="cs"){
      updateSessionState({ currentRound: msg.data });
      if(msg.data==="lobby"){
        console.log("Switching to lobby");
        broadcast_to_user(lobby,"lobby");
      }
      if(msg.data==="round1"){
        console.log("Switching to round1");
        broadcast_to_user(r1,"r1");
      }
      if(msg.data==="round2"){
        console.log("Switching to round2");
        broadcast_to_user(r2,"r2");
      }
      if(msg.data==="waiting1" || msg.data==="waiting2"){
        console.log(`Switching to ${msg.data}`);
        // Send waiting screen with leaderboard data
        const round = msg.data === "waiting1" ? "r1" : "r2";
        const roundName = msg.data === "waiting1" ? "ROUND 1" : "ROUND 2";
        const state = getSessionState();
        const topN = state.topN || 10;
        
        leaderboard(round).then(data => {
          broadcast_to_user(waiting, msg.data);
          // Send leaderboard data to all users
          setTimeout(() => {
            broadcastToUsers({ 
              type: "LEADERBOARD_UPDATE", 
              data: data,
              topN: topN,
              roundName: roundName
            });
          }, 500);
        }).catch(err => console.error("Leaderboard error:", err));
      }
      if(msg.data==="credits"){
        console.log("Switching to credits");
        const credits = openfile("pages/credits.html");
        broadcast_to_user(credits, "credits");
      }
      broadcastToAdmin({ type: "ROUND_CHANGED", data: msg.data });
     }
     
     // Set top N players for selection
     if(msg.type === "SET_TOP_N") {
       updateSessionState({ topN: msg.topN });
       console.log(`Top N set to: ${msg.topN}`);
       broadcastToAdmin({ type: "TOP_N_UPDATED", topN: msg.topN });
     }
     
     // Refresh waiting screen leaderboard
     if(msg.type === "REFRESH_LEADERBOARD") {
       const state = getSessionState();
       const round = msg.round || "r1";
       const roundName = round === "r1" ? "ROUND 1" : "ROUND 2";
       const topN = state.topN || 10;
       
       leaderboard(round).then(data => {
         broadcastToUsers({ 
           type: "LEADERBOARD_UPDATE", 
           data: data,
           topN: topN,
           roundName: roundName
         });
         ws.send(JSON.stringify({ type: "LEADERBOARD", data }));
       }).catch(err => console.error("Leaderboard error:", err));
     }
     
     // Set session password
     if(msg.type === "SET_PASSWORD") {
       updateSessionState({ password: msg.password });
       console.log(`Session password updated`);
       broadcastToAdmin({ type: "PASSWORD_UPDATED", success: true });
       // Notify all non-authenticated users to re-authenticate
       broadcast_auth_required();
     }
     
     // Toggle leaderboard name visibility
     if(msg.type === "TOGGLE_LEADERBOARD_NAMES") {
       const state = getSessionState();
       updateSessionState({ showNamesOnLeaderboard: !state.showNamesOnLeaderboard });
       const newState = getSessionState();
       broadcastToAdmin({ type: "LEADERBOARD_NAMES_TOGGLED", showNames: newState.showNamesOnLeaderboard });
       console.log(`Leaderboard names ${newState.showNamesOnLeaderboard ? 'VISIBLE' : 'ANONYMOUS'}`);
     }
     
     // Update question
     if(msg.type === "UPDATE_QUESTION") {
       const { round, qno, prompt, result, isImageTask } = msg;
       const state = getSessionState();
       
       if (round === 'r1') {
         state.r1Questions[qno] = {
           prompt: prompt,
           is_image_task: isImageTask || false,
           Result: result || ""
         };
       } else if (round === 'r2') {
         state.r2Questions[qno] = {
           prompt: prompt,
           is_image_task: isImageTask !== undefined ? isImageTask : true,
           Result: result || ""
         };
       }
       
       updateSessionState({ r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       broadcastToAdmin({ type: "QUESTIONS_UPDATED", r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       console.log(`Question ${round} Q${qno} updated`);
     }
     
     // Add new question
     if(msg.type === "ADD_QUESTION") {
       const { round, prompt, result, isImageTask } = msg;
       const state = getSessionState();
       
       if (round === 'r1') {
         const qno = Object.keys(state.r1Questions).length + 1;
         state.r1Questions[qno] = {
           prompt: prompt,
           is_image_task: isImageTask || false,
           Result: result || ""
         };
       } else if (round === 'r2') {
         const qno = Object.keys(state.r2Questions).length + 1;
         state.r2Questions[qno] = {
           prompt: prompt,
           is_image_task: isImageTask !== undefined ? isImageTask : true,
           Result: result || ""
         };
       }
       
       updateSessionState({ r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       broadcastToAdmin({ type: "QUESTIONS_UPDATED", r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       console.log(`New question added to ${round}`);
     }
     
     // Delete question
     if(msg.type === "DELETE_QUESTION") {
       const { round, qno } = msg;
       const state = getSessionState();
       
       if (round === 'r1' && state.r1Questions[qno]) {
         delete state.r1Questions[qno];
       } else if (round === 'r2' && state.r2Questions[qno]) {
         delete state.r2Questions[qno];
       }
       
       updateSessionState({ r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       broadcastToAdmin({ type: "QUESTIONS_UPDATED", r1Questions: state.r1Questions, r2Questions: state.r2Questions });
       console.log(`Question ${round} Q${qno} deleted`);
     }
     
     // Get all questions
     if(msg.type === "GET_QUESTIONS") {
       const state = getSessionState();
       ws.send(JSON.stringify({ 
         type: "QUESTIONS_DATA", 
         r1Questions: state.r1Questions, 
         r2Questions: state.r2Questions 
       }));
     }
     
     // Toggle session active state
     if(msg.type === "TOGGLE_SESSION") {
       const state = getSessionState();
       updateSessionState({ 
         isActive: !state.isActive,
         startTime: !state.isActive ? Date.now() : null
       });
       const newState = getSessionState();
       broadcastToAdmin({ type: "SESSION_TOGGLED", isActive: newState.isActive });
       console.log(`Session ${newState.isActive ? 'STARTED' : 'STOPPED'}`);
     }
     
     // Add API endpoint for load balancing
     if(msg.type === "ADD_API") {
       addApiEndpoint(msg.url, msg.key, msg.weight || 1);
       broadcastToAdmin({ 
         type: "API_LIST_UPDATED", 
         apiEndpoints: apiEndpoints.map(ep => ({ url: ep.url, failures: ep.failures, weight: ep.weight }))
       });
     }
     
     // Remove API endpoint
     if(msg.type === "REMOVE_API") {
       removeApiEndpoint(msg.url);
       broadcastToAdmin({ 
         type: "API_LIST_UPDATED", 
         apiEndpoints: apiEndpoints.map(ep => ({ url: ep.url, failures: ep.failures, weight: ep.weight }))
       });
     }
     
     // Get stats
     if(msg.type === "GET_STATS") {
       ws.send(JSON.stringify({
         type: "STATS",
         data: {
           connectedUsers: userConnections.size,
           authenticatedUsers: authenticatedUsers.size,
           sessionState: getSessionState(),
           apiEndpoints: apiEndpoints.map(ep => ({ url: ep.url, failures: ep.failures, weight: ep.weight }))
         }
       }));
     }
     
     // Kick user
     if(msg.type === "KICK_USER") {
       const conn = userConnections.get(msg.userId);
       if(conn) {
         conn.socket.send(JSON.stringify({ type: "FORCE_EXIT", message: msg.reason || "Kicked by admin" }));
         conn.socket.close();
         userConnections.delete(msg.userId);
         authenticatedUsers.delete(msg.userId);
         console.log(`User ${msg.userId} kicked`);
         sendUserListToAdmin();
       }
     }
     
     // Get user list
     if(msg.type === "GET_USERS") {
       sendUserListToAdmin();
     }
     
     // Get leaderboard for admin
     if(msg.type === "GET_LEADERBOARD") {
       leaderboard(msg.tablename || "r1", true)  // forAdmin=true - always show real names
         .then(data => ws.send(JSON.stringify({ type: "LEADERBOARD", data })))
         .catch(err => ws.send(JSON.stringify({ type: "ERROR", message: err.message })));
     }
     
     // Broadcast message to all users
     if(msg.type === "BROADCAST_MESSAGE") {
       broadcastToUsers({ type: "ADMIN_MESSAGE", message: msg.message });
       console.log(`Broadcast: ${msg.message}`);
     }
     
     // Send message to individual user
     if(msg.type === "SEND_MESSAGE") {
       const conn = userConnections.get(msg.userId);
       if(conn && conn.socket.readyState === WebSocket.OPEN) {
         conn.socket.send(JSON.stringify({ type: "ADMIN_MESSAGE", message: msg.message }));
         console.log(`Message to ${msg.userId}: ${msg.message}`);
       }
     }
  });
  
  ws.on('close', () => {
    console.log("Admin disconnected");
    adminAuthenticated.delete(ws.adminId);
  });
});

// Broadcast auth required to non-authenticated users
function broadcast_auth_required() {
  const state = getSessionState();
  if (!state.password) return;
  
  userConnections.forEach((conn, id) => {
    if (!authenticatedUsers.has(id) && conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.send(JSON.stringify({ type: "AUTH_REQUIRED" }));
    }
  });
}


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
  userConnections.set(socketId, { socket: ws, ip: ip, joinedAt: Date.now() });

  console.log(`User connected: ${socketId} (${ip})`);
  
  // Check if password is set
  const state = getSessionState();
  if (state.password) {
    // Require authentication
    ws.send(JSON.stringify({ type: "AUTH_REQUIRED" }));
  } else {
    // No password, auto-authenticate and send content
    authenticatedUsers.set(socketId, { ip, authenticated: true });
    ws.send(JSON.stringify({ type: "UPDATE_CONTENT", html: currentGlobalHTML }));
  }
  
  // Notify admin of new user
  broadcastToAdmin({ type: "USER_JOINED", id: socketId, ip: ip });
  sendUserListToAdmin();

  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);
      
      // Handle authentication
      if (msg.type === "AUTH") {
        const state = getSessionState();
        if (msg.password === state.password) {
          authenticatedUsers.set(socketId, { ip, authenticated: true, name: msg.name || "Anonymous" });
          ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }));
          ws.send(JSON.stringify({ type: "UPDATE_CONTENT", html: currentGlobalHTML }));
          
          broadcastToAdmin({ type: "USER_AUTHENTICATED", id: socketId, name: msg.name });
          sendUserListToAdmin();
        } else {
          ws.send(JSON.stringify({ type: "AUTH_FAILED", message: "Invalid password" }));
        }
      }
      
      // Handle submissions (only from authenticated users)
      if (msg.type === "SUBMIT") {
        if (!authenticatedUsers.has(socketId)) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Not authenticated" }));
          return;
        }
        
        const userData = authenticatedUsers.get(socketId);
        const { round, qno, submission } = msg;
        
        if (round === "r1") {
          submit1(userData.name || "Anonymous", ip, qno, submission)
            .then(result => ws.send(JSON.stringify({ 
              type: "SUBMIT_SUCCESS", 
              round, 
              qno, 
              score: result.score, 
              reason: result.reason 
            })))
            .catch(err => ws.send(JSON.stringify({ type: "SUBMIT_ERROR", message: err.message })));
        } else if (round === "r2") {
          submit2(userData.name || "Anonymous", ip, qno, submission)
            .then(result => ws.send(JSON.stringify({ 
              type: "SUBMIT_SUCCESS", 
              round, 
              qno, 
              score: result.score, 
              reason: result.reason 
            })))
            .catch(err => ws.send(JSON.stringify({ type: "SUBMIT_ERROR", message: err.message })));
        }
      }
      
      // Handle leaderboard requests
      if (msg.type === "GET_LEADERBOARD") {
        leaderboard(msg.tablename)
          .then(data => ws.send(JSON.stringify({ type: "LEADERBOARD", data })))
          .catch(err => ws.send(JSON.stringify({ type: "ERROR", message: err.message })));
      }
      
    } catch (err) {
      console.error("Message parsing error:", err);
    }
  });

  ws.on("close", () => {
    console.log(`User disconnected: ${socketId}`);
    userConnections.delete(socketId);
    authenticatedUsers.delete(socketId);
    broadcastToAdmin({ type: "USER_LEFT", id: socketId });
    sendUserListToAdmin();
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

// Broadcast to all authenticated users
function broadcastToUsers(data) {
  const payload = JSON.stringify(data);
  userConnections.forEach((conn, userId) => {
    if(authenticatedUsers.has(userId) && conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.send(payload);
    }
  });
}

// Send user list to admin
function sendUserListToAdmin() {
  const users = [];
  authenticatedUsers.forEach((data, id) => {
    const conn = userConnections.get(id);
    users.push({
      id,
      name: data.name || "Anonymous",
      ip: data.ip,
      joinedAt: conn ? conn.joinedAt : Date.now(),
      authenticated: data.authenticated
    });
  });
  broadcastToAdmin({ type: "USER_LIST", users });
}


beta.listen(4000, () => {
  console.log("> Admin server beta is successfully running.");
  console.log(`> Admin panel available at ${RED}http://localhost:4000/${RESET}`);
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
  console.log(">Database api is connected and ready.");
  console.log(`> API endpoint at ${RED}http://localhost:1212/${RESET}`);
});