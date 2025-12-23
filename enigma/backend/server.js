import http from "node:http";

// Helper function to parse JSON body from streams
const getBody = (req) => new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => resolve(JSON.parse(body || "{}")));
});

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.end(); return; }
    try {
        if (req.url === "/eni/" && req.method === "POST") {
            const data = await getBody(req);
            const result = await EnigmaScore(data.user, data.prompt, data.result);
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "success", data: result }));
        }
        if (req.url === "/pp/" && req.method === "POST") {
            const data = await getBody(req);
            PixelScore(data.u)
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "processed", received: data }));
        }
        res.writeHead(404);
        res.end("Not Found");
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(3000, () => console.log("Server running on port 3000"));

async function EnigmaScore(user, prompt, result) {
    // Constructing the specific content for Groq
    const content = `you are a json renderer that only returns {score:" ",reason:" "} (the score in % ) and nothing else. 
    Compare the user's prompt: "${user}" with the original prompt: "${prompt}". 
    The original prompt produced this result: ${result}. 
    Provide a score and reason.`;
    
    return await getGroqResponse(content);
}

async function PixelScore(user) {
  const content=`'You are an expert web development judge. Evaluate HTML/CSS code based on: creativity (35%), design aesthetics (25%), code quality (10%), responsiveness potential (15%), and innovation (15%). Return ONLY a JSON object with format: {"score": <number 0-100>, "feedback": "<brief evaluation>"} heres the user code ${user}'`
  return await getGroqResponse(content);

}


async function getGroqResponse(content) {
    const api = "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"; // Use environment variables for security!
    const url = "https://api.groq.com/openai/v1/chat/completions";
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${api}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: content }],
            temperature: 0.7
        }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response";
}



/*
getGroqResponse("create a speech on a fence","create a simple speech on chestertons fence",`The Wisdom of Chesterton’s Fence
Good morning/afternoon everyone,

I want to start with a short story. Imagine a man who decides to go for a walk in the countryside. He comes across a fence stretched across a road. He looks at it and thinks, "I don’t see any reason for this fence to be here. It’s in my way, and it seems useless." So, he tears it down.

This story is the basis for a principle known as Chesterton’s Fence, named after the writer G.K. Chesterton. His point was simple but profound: If you don’t see the use of an existing rule or tradition, that is precisely the reason you should not be allowed to destroy it.

Why We Tear Things Down
In our modern world, we value "disruption" and "innovation." When we see an old policy at work, a social custom, or a literal fence, our first instinct is often to view it as an obstacle. We assume that because we don’t understand its purpose, it must not have one.

The Hidden Purpose
Chesterton’s Fence teaches us intellectual humility. Most things exist for a reason.

That "annoying" corporate process might be there to prevent a massive legal error that happened ten years ago.

That "outdated" social tradition might be the glue holding a community together in ways we can't see on the surface.

The fence didn't grow out of the ground by magic. Someone built it. They didn't do it while sleepwalking, and they didn't do it to be annoying. They did it to solve a problem.

The Right Way to Change
This principle isn’t about being stuck in the past or never changing anything. It’s about informed change.

If you want to tear the fence down, Chesterton says you must first go away and figure out exactly why it was put there in the first place. Once you can say, "I understand that this fence was built to keep the neighbor's bull out of this field, but the neighbor no longer has a bull," then—and only then—can you safely pick up your tools and clear the path.

Conclusion
As we move forward in our careers and lives, let’s try to be builders who understand history, not just wrecking balls. Before we declare something "pointless," let's do the work to find the point. Only by respecting the past can we effectively build the future.

Thank you.

Would you like me to adapt this speech to be more specific to a professional setting or a school environment?`);*/