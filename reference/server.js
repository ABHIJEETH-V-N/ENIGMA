import http from "node:http";

const PORT = 5174;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>basic messaging</title>
            <style>
                body { font-family: monospace; padding: 20px; text-align: center; background: #f4f4f9; }
                input { padding: 15px; width: 80%; margin-bottom: 15px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }
                button { padding: 15px 30px; background: #28a745; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
                button:active { background: #218838; }
                #status { margin-top: 15px; font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>Send Messages</h2>
            <input type="text" id="userInput" placeholder="Type your message..." />
            <br>
            <button onclick="sendMessage()">Send Message</button>
            <p id="status"></p>

            <script>
                async function sendMessage() {
                    const input = document.getElementById('userInput');
                    const status = document.getElementById('status');
                    const text = input.value;
                    if (!text) return;

                    status.innerText = "Sending...";

                    try {
                        const response = await fetch('/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: text })
                        });

                        if (response.ok) {
                            status.innerText = "Sent!";
                            status.style.color = "green";
                            input.value = "";
                        }
                    } catch (e) {
                        status.innerText = "Connection Failed";
                        status.style.color = "red";
                    }
                }
            </script>
        </body>
        </html>
        `);
  } else if (req.method === "POST" && req.url === "/submit") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log(`[Input] ${req.socket.remoteAddress}: ${data.message}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success" }));
      } catch (error) {
        console.error("Invalid JSON received");
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
