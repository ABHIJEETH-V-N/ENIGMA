import http from "node:http"
import fetch from "./db/fetch.js"


const server=http.createServer((req,res)=>{
        if(req.url.endsWith("/")){
                fetch(res,"select * from USERS");
        }
       

})

server.listen(4758);