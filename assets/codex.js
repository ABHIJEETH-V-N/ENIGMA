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
   3. GAME ROUND LOGIC (Text & Image)
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

    // Simulate Network Request
    setTimeout(() => {
        // Send actual data to server here via WebSocket if needed:
        // socket.send(JSON.stringify({ type: 'ANSWER', value: val }));

        if(statusLine) {
            statusLine.textContent = "Status: DATA_SENT_SUCCESSFULLY";
            statusLine.style.color = "var(--term-green)";
        }
        
        if(btn) {
            btn.innerHTML = "Execute_Sequence";
            btn.disabled = false;
        }
        
        input.disabled = false;
        input.value = "";
        input.focus();

        setTimeout(() => {
            if(statusLine) {
                statusLine.textContent = "Status: WAITING_FOR_INPUT...";
                statusLine.style.color = "var(--term-dim)";
            }
        }, 3000);
    }, 1000);
}

function handleImageSubmit(textArea, imgElement) {
    if (textArea.innerText.trim() !== "") {
        console.log("TX:", textArea.innerText);
    }

    textArea.innerText = "";
    currentImgIdx = (currentImgIdx + 1) % images.length;

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
   4. WEBSOCKET & NETWORK CONTROLLER
   ========================================= */
const socket = new WebSocket("ws://" + location.host);
const container = document.getElementById("content-container");

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // SCREEN SWITCHING
    if (data.type === "UPDATE_CONTENT") {
        if (!container) return;

        // Fade out
        container.style.opacity = "0";
        
        setTimeout(() => {
            // Swap HTML
            container.innerHTML = data.html;
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

        // Update Title
        if (data.screen === "lobby") document.title = "ENIGMA - Event Lobby";
        if (data.screen === "r1") document.title = "ENIGMA - Round 1";
        if (data.screen === "r2") document.title = "ENIGMA - Round 2";
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
};

/* =========================================
   5. SECURITY LAYER
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