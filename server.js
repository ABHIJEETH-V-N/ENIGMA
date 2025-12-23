import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 5174;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  // 1. Serve the Client UI
  if (req.url === "/") {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading index.html");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  }

  // 2. Handle Real-Time Stream (SSE)
  else if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(
      `data: ${JSON.stringify({ message: "Connected to server!" })}\n\n`,
    );

    const intervalId = setInterval(() => {
      const updateData = {
        time: new Date().toLocaleTimeString(),
        value: Math.floor(Math.random() * 100),
      };
      res.write(`data: ${JSON.stringify(updateData)}\n\n`);
    }, 2000);

    req.on("close", () => {
      clearInterval(intervalId);
      console.log("Client disconnected");
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
