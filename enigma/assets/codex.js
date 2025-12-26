//lobby script

const qs = (s) => document.querySelector(s),
  ce = (t) => document.createElement(t);
const pc = qs("#particles"),
  out = qs("#console-output"),
  lb = qs("#boot-loader"),
  bar = qs("#boot-bar"),
  warn = qs("#refresh-warning");
for (let i = 0; i < 50; i++) {
  let p = ce("div");
  p.className = "particle";
  p.style.left = Math.random() * 100 + "%";
  p.style.animationDuration = Math.random() * 3 + 2 + "s";
  p.style.animationDelay = Math.random() * 5 + "s";
  pc.appendChild(p);
}
setInterval(
  () =>
    (qs("#clock").textContent =
      new Date().toISOString().split("T")[1].split(".")[0] + " UTC"),
  1000
);
const msgs = [
  "Booting ENIGMA Event Core...",
  "Loading team environments...",
  "Initializing challenge modules...",
  "Syncing Imagers Assets...",
  "Establishing secure connection...",
  "Done.",
];
let idx = 0;
function type(txt, cb) {
  let l = ce("div");
  l.className = "log-line";
  l.innerHTML = `<span class="log-prefix">></span><span></span>`;
  out.appendChild(l);
  let sp = l.lastChild,
    c = 0,
    int = setInterval(() => {
      sp.textContent += txt.charAt(c++);
      if (c >= txt.length) {
        clearInterval(int);
        if (cb) setTimeout(cb, 300);
      }
    }, 30);
}
function run() {
  if (idx === 0) lb.style.display = "block";
  bar.style.width = Math.min(((idx + 1) / msgs.length) * 100, 100) + "%";
  if (idx < msgs.length) type(msgs[idx++], run);
  else
    setTimeout(() => {
      lb.style.display = "none";
      showLogo();
    }, 500);
}
function showLogo() {
  let l = ce("div");
  l.className = "enigma-logo show";
  l.textContent = "ENIGMA";
  l.setAttribute("data-text", "ENIGMA");
  out.appendChild(l);
  let s = ce("div");
  s.className = "final-status show";
  s.innerHTML =
    ">> Event lobby active — waiting for host to begin <span class='cursor'></span>";
  out.appendChild(s);
}
setTimeout(run, 1000);
document.addEventListener(
  "mousemove",
  (e) => (warn.style.display = e.clientY < 50 ? "flex" : "none")
);
window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "";
});

// txt script

// Configuration
const instructionText = `A futuristic university campus with modern buildings and flying drones, wide-angle view with sunset lighting in a sci-fi theme.`;

// Typewriter Effect
const typeWriterElement = document.getElementById("typewriter-text");
const speed = 20; // ms per char
let i = 0;

function typeWriter() {
  if (i < instructionText.length) {
    typeWriterElement.textContent += instructionText.charAt(i);
    i++;
    // Scroll to bottom
    const panelContent = typeWriterElement.parentElement;
    panelContent.scrollTop = panelContent.scrollHeight;
    setTimeout(typeWriter, speed);
  }
}

// Start typing on load
window.addEventListener("load", () => {
  setTimeout(typeWriter, 500);

  // Focus textarea on load?? Maybe not to allow reading first.
  // But let's set focus when they click anywhere in the right panel
  const inputPanel = document.querySelector(".input-panel");
  inputPanel.addEventListener("click", () => {
    document.getElementById("user-input").focus();
  });
});

// Submit Logic
function handleSubmit() {
  const input = document.getElementById("user-input");
  const btn = document.getElementById("submit-btn");
  const statusLine = document.getElementById("status-line");
  const val = input.value.trim();

  if (!val) {
    statusLine.textContent = "Status: ERROR [EMPTY_INPUT]";
    statusLine.style.color = "red";
    setTimeout(() => {
      statusLine.textContent = "Status: WAITING_FOR_INPUT...";
      statusLine.style.color = "var(--term-dim)";
    }, 2000);
    return;
  }

  // Simulate processing
  statusLine.textContent = "Status: PROCESSING...";
  btn.innerHTML = "Submitting...";
  btn.disabled = true;
  input.disabled = true;

  setTimeout(() => {
    // Here is where you'd validate the answer or send to server
    // For demo, we just reset or show success

    // Demo success/fail logic (Just for visual)
    const isCorrect = val.toLowerCase() === "some answer";
    // Note: User didn't ask for real validation logic, just UI.

    statusLine.textContent = "Status: DATA_SENT_SUCCESSFULLY";
    statusLine.style.color = "var(--term-green)";

    btn.innerHTML = "Execute_Sequence";
    btn.disabled = false;
    input.disabled = false;
    input.value = "";
    input.focus();

    alert("COMMAND RECEIVED.\nSolution: " + val + "\n\n(Submitted to Enigma.)");

    setTimeout(() => {
      statusLine.textContent = "Status: WAITING_FOR_INPUT...";
      statusLine.style.color = "var(--term-dim)";
    }, 3000);
  }, 1000);
}

// Add support for Ctrl+Enter to submit
document.getElementById("user-input").addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.key === "Enter") {
    handleSubmit();
  }
});

// Typing status effect
let typingTimer;
const userInputBox = document.getElementById("user-input");
const statusLabel = document.getElementById("status-line");

userInputBox.addEventListener("input", () => {
  statusLabel.textContent = "Status: TYPING...";
  statusLabel.style.color = "var(--term-white)";

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    statusLabel.textContent = "Status: WAITING_FOR_INPUT...";
    statusLabel.style.color = "var(--term-dim)";
  }, 800);
});

//image script
const images = ["/assets/apple.png", "/assets/cat.png", "/assets/chair.png"];
let currentIdx = 0;

function handleSubmit() {
  const textArea = document.getElementById("ta");
  const imgElement = document.getElementById("displayImage");

  if (textArea.innerText.trim() !== "") {
    console.log("TX:", textArea.innerText);
  }

  textArea.innerText = "";
  currentIdx = (currentIdx + 1) % images.length;

  imgElement.style.filter = "brightness(3) invert(1)";

  setTimeout(() => {
    imgElement.src = images[currentIdx];
    imgElement.style.filter = "invert(0)";
  }, 100);

  textArea.focus();
}


