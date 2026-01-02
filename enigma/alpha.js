import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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



const openfile=(input)=>{
  try {
    // readFileSync stops execution until the file is read, returning the content
    return fs.readFileSync(path.join(__dirname, input), "utf8");
  } catch (err) {
    console.log("error fetching " + input);
    return "error fetching " + input; 
  }
}

const getMainHTML=()=>{
    return openfile("index.html");
}



alpha.listen(2026,'0.0.0.0',()=>{
    console.log("server in localhost:2026/");   
    console.log("> at https://hyper.local:2026/");
})