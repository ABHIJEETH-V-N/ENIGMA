/* =========================================
   1. GLOBAL UTILITIES & BACKGROUND EFFECTS
   ========================================= */
const qs = (s) => document.querySelector(s);
const ce = (t) => document.createElement(t);

// --- Particle Background System ---
const pc = qs("#particles");
if (pc) {
    for (let i = 0; i < 50; i++) {
        let p = ce("div");
        p.className = "particle";
        p.style.left = Math.random() * 100 + "%";
        p.style.animationDuration = Math.random() * 3 + 2 + "s";
        p.style.animationDelay = Math.random() * 5 + "s";
        pc.appendChild(p);
    }
}

// --- Real-time Clock ---
setInterval(() => {
    const clock = qs("#clock");
    if (clock) {
        clock.textContent = new Date().toISOString().split("T")[1].split(".")[0] + " UTC";
    }
}, 1000);

/* =========================================
   2. LOBBY BOOT SEQUENCE
   ========================================= */
const msgs = [
    "Booting ENIGMA Event Core...",
    "Loading team environments...",
    "Initializing challenge modules...",
    "Syncing Imagers Assets...",
    "Establishing secure connection...",
    "Done.",
];
let bootIdx = 0;

function typeLog(txt, cb) {
    const out = qs("#console-output");
    if (!out) return;
    
    let l = ce("div");
    l.className = "log-line";
    l.innerHTML = `<span class="log-prefix">></span><span></span>`;
    out.appendChild(l);
    
    let sp = l.lastChild, c = 0, int = setInterval(() => {
        sp.textContent += txt.charAt(c++);
        if (c >= txt.length) {
            clearInterval(int);
            if (cb) setTimeout(cb, 300);
        }
    }, 30);
}

function runBootSequence() {
    const lb = qs("#boot-loader");
    const bar = qs("#boot-bar");
    
    // Only run if we are actually on the lobby screen
    if (!lb || !bar) return; 

    if (bootIdx === 0) lb.style.display = "block";
    bar.style.width = Math.min(((bootIdx + 1) / msgs.length) * 100, 100) + "%";

    if (bootIdx < msgs.length) {
        typeLog(msgs[bootIdx++], runBootSequence);
    } else {
        setTimeout(() => {
            lb.style.display = "none";
            showLogo();
        }, 500);
    }
}

function showLogo() {
    const out = qs("#console-output");
    if (!out) return;

    let l = ce("div");
    l.className = "enigma-logo show";
    l.textContent = "ENIGMA";
    l.setAttribute("data-text", "ENIGMA");
    out.appendChild(l);
    
    let s = ce("div");
    s.className = "final-status show";
    s.innerHTML = ">> Event lobby active — waiting for host to begin <span class='cursor'></span>";
    out.appendChild(s);
}

// Attempt to start boot if elements exist on load
if (qs("#boot-loader")) {
    setTimeout(runBootSequence, 1000);
}

/* =========================================
   3. AUTHENTICATION SYSTEM
   ========================================= */
let isAuthenticated = false;
let currentRound = "lobby";
let currentQuestionNo = 1;
let userName = "";

function showAuthModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('auth-modal');
    if (existingModal) existingModal.remove();
    
    const modal = ce('div');
    modal.id = 'auth-modal';
    modal.innerHTML = `
        <style>
            #auth-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .auth-box {
                background: #111;
                border: 2px solid #33ff00;
                border-radius: 10px;
                padding: 40px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 0 30px rgba(51, 255, 0, 0.3);
            }
            .auth-title {
                color: #33ff00;
                font-size: 1.5rem;
                text-align: center;
                margin-bottom: 30px;
                text-shadow: 0 0 10px rgba(51, 255, 0, 0.5);
            }
            .auth-input {
                width: 100%;
                padding: 15px;
                margin-bottom: 15px;
                background: #0a0a0a;
                border: 1px solid #333;
                border-radius: 5px;
                color: #fff;
                font-family: monospace;
                font-size: 1rem;
            }
            .auth-input:focus {
                outline: none;
                border-color: #33ff00;
            }
            .auth-btn {
                width: 100%;
                padding: 15px;
                background: #33ff00;
                border: none;
                border-radius: 5px;
                color: #000;
                font-family: monospace;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            .auth-btn:hover {
                box-shadow: 0 0 20px rgba(51, 255, 0, 0.5);
            }
            .auth-error {
                color: #ff3333;
                text-align: center;
                margin-top: 15px;
                display: none;
            }
        </style>
        <div class="auth-box">
            <div class="auth-title">🔐 ENIGMA SESSION LOGIN</div>
            <input type="text" class="auth-input" id="auth-name" placeholder="Enter your name..." />
            <input type="password" class="auth-input" id="auth-password" placeholder="Enter session password..." />
            <button class="auth-btn" onclick="submitAuth()">ACCESS SYSTEM</button>
            <div class="auth-error" id="auth-error">Invalid password. Access denied.</div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus name input
    setTimeout(() => document.getElementById('auth-name')?.focus(), 100);
    
    // Enter key support
    document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAuth();
    });
}

function submitAuth() {
    const name = document.getElementById('auth-name')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    
    if (!name) {
        showAuthError('Please enter your name');
        return;
    }
    
    userName = name;
    socket.send(JSON.stringify({ type: 'AUTH', name, password }));
}

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
}

/* =========================================
   4. GAME ROUND LOGIC (Text & Image)
   ========================================= */

// Config
const instructionText = `A futuristic university campus with modern buildings and flying drones, wide-angle view with sunset lighting in a sci-fi theme.`;
const images = ["/assets/apple.png", "/assets/cat.png", "/assets/chair.png"];
let currentImgIdx = 0;
let typeWriterIdx = 0;

// --- Unified Submit Handler ---
function handleSubmit() {
    const textInput = document.getElementById("user-input");
    const imageDisplay = document.getElementById("displayImage");
    const textArea = document.getElementById("ta");

    // DETECT: Are we in a Text Round?
    if (textInput) {
        handleTextSubmit(textInput);
    } 
    // DETECT: Are we in an Image Round?
    else if (imageDisplay && textArea) {
        handleImageSubmit(textArea, imageDisplay);
    }
}

function handleTextSubmit(input) {
    const btn = document.getElementById("submit-btn");
    const statusLine = document.getElementById("status-line");
    const val = input.value.trim();

    if (!val) {
        if(statusLine) {
            statusLine.textContent = "Status: ERROR [EMPTY_INPUT]";
            statusLine.style.color = "red";
            setTimeout(() => {
                statusLine.textContent = "Status: WAITING_FOR_INPUT...";
                statusLine.style.color = "var(--term-dim)";
            }, 2000);
        }
        return;
    }

    // Processing UI
    if(statusLine) statusLine.textContent = "Status: PROCESSING...";
    if(btn) {
        btn.innerHTML = "Submitting...";
        btn.disabled = true;
    }
    input.disabled = true;

    // Send submission via WebSocket
    socket.send(JSON.stringify({
        type: 'SUBMIT',
        round: 'r1',
        qno: currentQuestionNo,
        submission: val
    }));

    // Wait for response (handled in onmessage)
    setTimeout(() => {
        if(btn) {
            btn.innerHTML = "Execute_Sequence";
            btn.disabled = false;
        }
        input.disabled = false;
        input.value = "";
        input.focus();
    }, 1000);
}

function handleImageSubmit(textArea, imgElement) {
    const val = textArea.innerText.trim();
    
    if (val !== "") {
        // Send submission via WebSocket
        socket.send(JSON.stringify({
            type: 'SUBMIT',
            round: 'r2',
            qno: currentQuestionNo,
            submission: val
        }));
    }

    textArea.innerText = "";
    currentImgIdx = (currentImgIdx + 1) % images.length;
    currentQuestionNo = currentImgIdx + 1;

    // Glitch Effect
    imgElement.style.filter = "brightness(3) invert(1)";
    setTimeout(() => {
        imgElement.src = images[currentImgIdx];
        imgElement.style.filter = "invert(0)";
    }, 100);

    textArea.focus();
}

// --- Dynamic Setup (Runs every time screen changes) ---
function setupScreen() {
    // 1. Setup Typewriter if present
    const typeWriterElement = document.getElementById("typewriter-text");
    if (typeWriterElement) {
        typeWriterIdx = 0;
        typeWriterElement.textContent = "";
        
        function runTypeWriter() {
            if (typeWriterIdx < instructionText.length) {
                typeWriterElement.textContent += instructionText.charAt(typeWriterIdx);
                typeWriterIdx++;
                typeWriterElement.parentElement.scrollTop = typeWriterElement.parentElement.scrollHeight;
                setTimeout(runTypeWriter, 20);
            }
        }
        setTimeout(runTypeWriter, 500);
    }

    // 2. Setup Input Listeners
    const inputPanel = document.querySelector(".input-panel");
    const userInput = document.getElementById("user-input");
    if (inputPanel && userInput) {
        inputPanel.addEventListener("click", () => userInput.focus());
        
        // Typing status
        userInput.addEventListener("input", () => {
            const statusLabel = document.getElementById("status-line");
            if (statusLabel) {
                statusLabel.textContent = "Status: TYPING...";
                statusLabel.style.color = "var(--term-white)";
            }
        });

        // Ctrl+Enter Submit
        userInput.addEventListener("keydown", function (e) {
            if (e.ctrlKey && e.key === "Enter") {
                handleSubmit();
            }
        });
    }
}

/* =========================================
   5. WEBSOCKET & NETWORK CONTROLLER
   ========================================= */
const socket = new WebSocket("ws://" + location.host);
const container = document.getElementById("content-container");

socket.onopen = () => {
    console.log("Connected to ENIGMA server");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // AUTH REQUIRED
    if (data.type === "AUTH_REQUIRED") {
        isAuthenticated = false;
        showAuthModal();
    }

    // AUTH SUCCESS
    if (data.type === "AUTH_SUCCESS") {
        isAuthenticated = true;
        userName = data.name || userName;
        hideAuthModal();
        showNotification("Access granted. Welcome to ENIGMA.", "success");
        
        // Store userName for waiting screen and other pages
        sessionStorage.setItem('enigma_userName', userName);
        localStorage.setItem('enigma_userName', userName);
        
        // Update userName display if on lobby
        const userNameEl = document.getElementById('userName');
        if (userNameEl && userName) {
            userNameEl.textContent = userName.toUpperCase();
        }
    }

    // AUTH FAILED
    if (data.type === "AUTH_FAILED") {
        showAuthError(data.message || "Invalid password");
    }

    // ADMIN MESSAGE
    if (data.type === "ADMIN_MESSAGE") {
        // Show in lobby admin message box if it exists
        const adminMsgBox = document.getElementById('adminMessage');
        const adminMsgText = document.getElementById('adminMessageText');
        if (adminMsgBox && adminMsgText) {
            adminMsgText.textContent = data.message;
            adminMsgBox.classList.add('show');
        }
        // Also show as notification
        showNotification("📢 " + data.message, "info");
    }

    // SUBMISSION SUCCESS
    if (data.type === "SUBMIT_SUCCESS") {
        const statusLine = document.getElementById("status-line");
        if (statusLine) {
            statusLine.textContent = "Status: SUBMISSION_ACCEPTED";
            statusLine.style.color = "var(--term-green)";
            setTimeout(() => {
                statusLine.textContent = "Status: WAITING_FOR_INPUT...";
                statusLine.style.color = "var(--term-dim)";
            }, 3000);
        }
        
        // Handle score display for R1 and R2
        if (data.score !== undefined) {
            if (data.round === 'r1' && typeof handleR1Score === 'function') {
                handleR1Score(data.qno, data.score, data.reason);
            } else if (data.round === 'r2' && typeof handleR2Score === 'function') {
                handleR2Score(data.qno, data.score, data.reason);
            }
        }
        
        showNotification(`Score: ${data.score || 'Submitted'}`, "success");
    }

    // SUBMISSION ERROR
    if (data.type === "SUBMIT_ERROR") {
        const statusLine = document.getElementById("status-line");
        if (statusLine) {
            statusLine.textContent = "Status: SUBMISSION_FAILED";
            statusLine.style.color = "red";
        }
        showNotification(data.message || "Submission failed", "error");
    }

    // LEADERBOARD
    if (data.type === "LEADERBOARD") {
        updateLeaderboard(data.data);
    }

    // LEADERBOARD UPDATE (for waiting screens)
    if (data.type === "LEADERBOARD_UPDATE") {
        // Call the waiting screen render function if it exists
        if (typeof renderWaitingLeaderboard === 'function') {
            renderWaitingLeaderboard(data.data, data.topN, data.roundName);
        }
    }

    // TIMER EVENTS
    if (data.type === "TIMER_START" || data.type === "TIMER_UPDATE" || data.type === "TIMER_RESUME") {
        if (typeof updateTimerDisplay === 'function') {
            updateTimerDisplay(data.remaining);
        }
        // Backup timer display if function doesn't exist
        const timerEl = document.getElementById('timer') || document.getElementById('countdown');
        if (timerEl && data.remaining !== undefined) {
            const mins = Math.floor(data.remaining / 60);
            const secs = data.remaining % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            // Urgent styling when low time
            if (data.remaining <= 30) {
                timerEl.style.color = '#ff3333';
                timerEl.style.animation = 'pulse 0.5s infinite';
            } else if (data.remaining <= 60) {
                timerEl.style.color = '#ffaa00';
            }
        }
    }

    if (data.type === "TIMER_PAUSE" || data.type === "TIMER_STOP") {
        if (typeof pauseTimerDisplay === 'function') {
            pauseTimerDisplay(data.remaining);
        }
    }

    if (data.type === "TIMER_END") {
        if (typeof handleTimerEnd === 'function') {
            handleTimerEnd();
        }
        showNotification("⏰ Time's up!", "warning");
    }

    // ELIMINATION/WAITING
    if (data.type === "ELIMINATED") {
        showNotification(data.message || "You have not been selected for the next round", "error");
    }

    if (data.type === "WAITING") {
        showNotification(data.message || "Please wait for further instructions", "info");
    }

    if (data.type === "ADVANCED") {
        showNotification(`Advancing to ${data.screen}!`, "success");
    }

    // SCREEN SWITCHING
    if (data.type === "UPDATE_CONTENT") {
        if (!container) return;

        // Fade out
        container.style.opacity = "0";
        
        setTimeout(() => {
            // Swap HTML
            container.innerHTML = data.html;
            
            // Execute any inline scripts in the new content
            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Copy attributes
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                // Copy content
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            
            // Fade in
            container.style.opacity = "1";
            
            // Re-initialize scripts for the new HTML
            setupScreen(); 

            // Boot Sequence check (if we went back to lobby)
            if (qs("#boot-loader")) {
                bootIdx = 0; // Reset boot index
                runBootSequence();
            }

        }, 300);

        // Update Title and track current round
        if (data.screen === "lobby") {
            document.title = "ENIGMA - Event Lobby";
            currentRound = "lobby";
            // Update userName display in lobby
            setTimeout(() => {
                const userNameEl = document.getElementById('userName');
                if (userNameEl && userName) {
                    userNameEl.textContent = userName.toUpperCase();
                }
            }, 100);
        }
        if (data.screen === "r1") {
            document.title = "ENIGMA - Round 1";
            currentRound = "r1";
            currentQuestionNo = 1;
        }
        if (data.screen === "r2") {
            document.title = "ENIGMA - Round 2";
            currentRound = "r2";
            currentQuestionNo = 1;
        }
        if (data.screen === "waiting") {
            document.title = "ENIGMA - Waiting";
            currentRound = "waiting";
        }
        if (data.screen === "waiting1") {
            document.title = "ENIGMA - Round 1 Results";
            currentRound = "waiting1";
        }
        if (data.screen === "waiting2") {
            document.title = "ENIGMA - Final Results";
            currentRound = "waiting2";
        }
        if (data.screen === "credits") {
            document.title = "ENIGMA - Credits";
            currentRound = "credits";
        }
    }

    // KICK/BAN SYSTEM
    if (data.type === "FORCE_EXIT") {
        const kickScreen = document.getElementById("kicked");
        const reason = document.getElementById("reason");
        if(kickScreen && reason) {
            kickScreen.style.display = "flex";
            reason.innerText = data.message;
        }
        socket.close();
    }
};

socket.onclose = () => {
    console.log("Connection to Enigma Core lost.");
    showNotification("Connection lost. Please refresh.", "error");
};

socket.onerror = (err) => {
    console.error("WebSocket error:", err);
};

// Request leaderboard
function requestLeaderboard(tablename) {
    socket.send(JSON.stringify({ type: 'GET_LEADERBOARD', tablename }));
}

// Update leaderboard UI (if present)
function updateLeaderboard(data) {
    const leaderboardEl = document.getElementById('leaderboard');
    if (!leaderboardEl || !data) return;
    
    leaderboardEl.innerHTML = data.map((entry, idx) => `
        <div class="leaderboard-entry">
            <span class="rank">#${idx + 1}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.total_score}</span>
        </div>
    `).join('');
}

// Notification system
function showNotification(message, type = "info") {
    const existing = document.getElementById('enigma-notification');
    if (existing) existing.remove();
    
    const notif = ce('div');
    notif.id = 'enigma-notification';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#1a4d1a' : type === 'error' ? '#4d1a1a' : '#1a1a4d'};
        border: 1px solid ${type === 'success' ? '#33ff00' : type === 'error' ? '#ff3333' : '#3333ff'};
        border-radius: 8px;
        color: #fff;
        font-family: monospace;
        font-size: 0.9rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    notif.textContent = message;
    
    // Add animation
    const style = ce('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

/* =========================================
   6. SECURITY LAYER
   ========================================= */
const warn = qs("#refresh-warning");
document.addEventListener("mousemove", (e) => {
    if (warn) warn.style.display = e.clientY < 50 ? "flex" : "none";
});

window.addEventListener("beforeunload", (e) => {
    e.preventDefault();
    e.returnValue = "";
});

// Anti-Inspect
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.onkeydown = (e) => {
    if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
    ) {
        return false;
    }
};