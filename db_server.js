import pkg from 'pg';
const { Pool } = pkg
import http from 'node:http';
import { r1_questions ,r2_questions} from "./data.js";
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'forge',
  password: process.env.DB_PASSWORD || 'Event5790$',
  port: parseInt(process.env.DB_PORT) || 5432,
  max: 20,
  // Connection pool optimizations
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Session state management
let sessionState = {
  password: process.env.DEFAULT_PASSWORD || "123",
  currentRound: "lobby",
  isActive: false,
  startTime: null,
  showNamesOnLeaderboard: false,  // New: anonymous by default
  r1Questions: { ...r1_questions },  // Editable copy
  r2Questions: { ...r2_questions }   // Editable copy
};

// API Load Balancer Configuration - load from environment variables
function loadApiEndpointsFromEnv() {
  const endpoints = [];
  const baseUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  
  // Check for numbered keys: GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim()) {
      endpoints.push({
        name: `Groq ${i}`,
        url: baseUrl,
        key: key.trim(),
        model: model,
        weight: 1,
        failures: 0
      });
    }
  }
  
  // Fallback: check for single GROQ_API_KEY if no numbered keys found
  if (endpoints.length === 0 && process.env.GROQ_API_KEY) {
    endpoints.push({
      name: "Groq Primary",
      url: baseUrl,
      key: process.env.GROQ_API_KEY.trim(),
      model: model,
      weight: 1,
      failures: 0
    });
  }
  
  return endpoints;
}

const apiEndpoints = loadApiEndpointsFromEnv();

// Log loaded endpoints (without exposing full keys)
console.log(`\n📡 API Load Balancer: Loaded ${apiEndpoints.length} endpoint(s)`);
apiEndpoints.forEach((ep, i) => {
  const maskedKey = ep.key.length > 12 ? ep.key.slice(0, 8) + '...' + ep.key.slice(-4) : '****';
  console.log(`   ${i + 1}. ${ep.name} [${maskedKey}]`);
});
console.log('');

// Request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const RATE_LIMIT_DELAY = 100; // ms between requests

// Get next available API endpoint (weighted round-robin with health check)
function getNextApiEndpoint() {
  const healthyEndpoints = apiEndpoints.filter(ep => ep.failures < 3);
  if (healthyEndpoints.length === 0) {
    // Reset all endpoints if all are failed
    apiEndpoints.forEach(ep => ep.failures = 0);
    return apiEndpoints[0];
  }
  // Simple round-robin for now
  const totalWeight = healthyEndpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  for (const ep of healthyEndpoints) {
    random -= ep.weight;
    if (random <= 0) return ep;
  }
  return healthyEndpoints[0];
}

// Add new API endpoint dynamically
function addApiEndpoint(url, key, weight = 1) {
  apiEndpoints.push({ url, key, weight, failures: 0 });
  console.log(`API endpoint added: ${url}`);
}

// Remove API endpoint
function removeApiEndpoint(url) {
  const idx = apiEndpoints.findIndex(ep => ep.url === url);
  if (idx > -1) {
    apiEndpoints.splice(idx, 1);
    console.log(`API endpoint removed: ${url}`);
  }
}

// Get session state
function getSessionState() {
  return { ...sessionState };
}

// Update session state
function updateSessionState(updates) {
  sessionState = { ...sessionState, ...updates };
  return sessionState;
}

// Process request queue
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { resolve, reject, args } = requestQueue.shift();
    try {
      const result = await calcInternal(...args);
      resolve(result);
    } catch (err) {
      reject(err);
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  
  isProcessingQueue = false;
}

async function calcInternal(target_prompt, user_input, is_image_task = false, reference_result = "") {
  const resultContext = (!is_image_task && reference_result) 
    ? `Result: "${reference_result}". Compare the USER_PROMPT's ability to achieve similar semantic depth.`
    : `Note: This is an image generation task. Do not expect a result text/binary. Judge the USER_PROMPT solely on its technical keywords, style, and descriptive potential compared to the TARGET_PROMPT.`;

  const body = `
    Act as a strict competitive judge for a prompt engineering contest.note that if both result and the user prompt are same then provide score 0
    (take this into strong consideration also it must not be a kind of like a part of the result too take strong critical assesment of the result and the userprompt so its fair and right also make sure that the prompt is like a prompt not like the result a main part of the methodology)
    make sure that the reason doesnt reveal information or doenst say what the prompt really is  so the hints are hidden the reason must only be for if the users view lacks description or else provide them with try again or think more about it or something like that 
    provide 100 if both user prompt and the target prompt are very similar like almost identical in nature also if same
    

    You will be given two prompts:
    1. TARGET_PROMPT: The ideal prompt that achieves the desired output.
    2. USER_PROMPT: The prompt submitted by a contestant.
    Your task is to evaluate how well the USER_PROMPT aligns with the TARGET_PROMPT in terms of technical detail, style, and ability to generate similar results.
    

    TASK TYPE: ${is_image_task ? "IMAGE GENERATION" : "TEXT GENERATION"}
    TARGET_PROMPT: "${target_prompt}"
    USER_PROMPT: "${user_input}"
    ${resultContext}
    if this result is similar to the user prompt then provide score 0
    JUDGING CRITERIA:
    - 100: Perfect. The user prompt is functionally identical or superior in technical detail.
    - 80-99: Strong alignment with minor missing constraints.
    - 40-79: Moderate alignment; captures the "vibe" but lacks specific technical keywords or tone.
    - 0-39: Poor or unrelated.

    RULES:
    1. Be very strict. 100 is like somewhat hard to get not too strict.
    2. Ignore conversational fluff in the user's input.
    3. Return ONLY: {"score": number, "reason": "text"} like a json renderer let the reason be very short like 1 line
    4. if both result and the user prompt are same then provide score 0
    5 provide 100 only if the user prompt matches like too similar to the intended prompt
  `;
  
  const endpoint = getNextApiEndpoint();
  
  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${endpoint.key}`
      },
      body: JSON.stringify({
        model: endpoint.model || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: body }]
      })
    });
    
    if (!response.ok) {
      endpoint.failures++;
      throw new Error(`API request failed: ${response.status}`);
    }
    
    // Reset failures on success
    endpoint.failures = 0;
    const data = await response.json();
    return data.choices[0]?.message?.content;
  } catch (err) {
    endpoint.failures++;
    console.error(`API endpoint ${endpoint.url} failed:`, err.message);
    throw err;
  }
}

// Queued calc function for rate limiting
async function calc(target_prompt, user_input, is_image_task = false, reference_result = "") {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, args: [target_prompt, user_input, is_image_task, reference_result] });
    processQueue();
  });
}


const submit1= async(name,ip,qno,submission)=>{
    try{
        const Query="CALL SUBMIT1($1,$2,$3,$4,$5,$6)";
        const questions = sessionState.r1Questions;
        if (!questions[qno]) throw new Error(`Question ${qno} not found`);
        const score_reason=await calc(questions[qno].prompt, submission, questions[qno].is_image_task, questions[qno].Result);
        const {score, reason} = JSON.parse(score_reason);
        const values=[name, ip, qno, submission, score, reason];
        await pool.query(Query, values);
        console.log(`R1 Q${qno} submission: ${name} scored ${score}`);
        return { score, reason };
    }
    catch(err){
        console.error("Error:", err);
        throw err;
    }
}


const submit2= async(name,ip,qno,submission)=>{
    try{
        const Query="CALL SUBMIT2($1,$2,$3,$4,$5,$6)";
        const questions = sessionState.r2Questions;
        if (!questions[qno]) throw new Error(`Question ${qno} not found`);
        const score_reason=await calc(questions[qno].prompt, submission, questions[qno].is_image_task, questions[qno].Result);
        const {score, reason} = JSON.parse(score_reason);
        const values=[name, ip, qno, submission, score, reason];
        await pool.query(Query, values);
        console.log(`R2 Q${qno} submission: ${name} scored ${score}`);
        return { score, reason };
    }
    catch(err){
        console.error("Error:", err);
        throw err;
    }

}

// Anonymize names for user-facing leaderboard
function anonymizeName(name, index) {
  return `Player ${index + 1}`;
}

const leaderboard = async (tablename, forAdmin = false) => {
    try {
        const query = `SELECT get_leaderboard($1) AS data`;
        console.log(`Fetching leaderboard for: ${tablename}, forAdmin: ${forAdmin}`);
        const res = await pool.query(query, [tablename]);
        let data = res.rows[0]?.data || [];
        console.log(`Leaderboard raw data:`, JSON.stringify(data).slice(0, 200));
        
        // Anonymize names for users unless admin has enabled showing names
        if (!forAdmin && !sessionState.showNamesOnLeaderboard) {
          data = data.map((entry, idx) => ({
            ...entry,
            name: anonymizeName(entry.name, idx)
          }));
        }
        
        return data;
    }
    catch (err) {
        console.error("Leaderboard Error:", err.message);
        return [];
    }
}

//leaderboard('r1').then(data => console.log("Round 1 Leaderboard:", JSON.stringify(data, null, 2)));
//leaderboard('r2').then(data => console.log("Round 2 Leaderboard:", JSON.stringify(data, null, 2)));

//submit1("Alice","192.2.12.1",1,"A robot in a neon-lit city discovers love through unexpected connections.");

export { submit1, submit2, leaderboard, getSessionState, updateSessionState, addApiEndpoint, removeApiEndpoint, apiEndpoints, r1_questions, r2_questions };

