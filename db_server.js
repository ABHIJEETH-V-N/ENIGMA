import pkg from 'pg';
const { Pool } = pkg
import http from 'node:http';
import { r1_questions ,r2_questions} from "./data.js";

const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'forge',
  password: 'Event5790$', port: 5432, max: 20,
});




async function calc(target_prompt, user_input, is_image_task = false, reference_result = "") {
  const resultContext = (!is_image_task && reference_result) 
    ? `For reference, the TARGET_PROMPT produced this text result: "${reference_result}". Compare the USER_PROMPT's ability to achieve similar semantic depth.`
    : `Note: This is an image generation task. Do not expect a result text/binary. Judge the USER_PROMPT solely on its technical keywords, style, and descriptive potential compared to the TARGET_PROMPT.`;

  const body = `
    Act as a strict competitive judge for a prompt engineering contest.

    TASK TYPE: ${is_image_task ? "IMAGE GENERATION" : "TEXT GENERATION"}
    TARGET_PROMPT: "${target_prompt}"
    USER_PROMPT: "${user_input}"
    ${resultContext}

    JUDGING CRITERIA:
    - 100: Perfect. The user prompt is functionally identical or superior in technical detail.
    - 80-99: Strong alignment with minor missing constraints.
    - 40-79: Moderate alignment; captures the "vibe" but lacks specific technical keywords or tone.
    - 0-39: Poor or unrelated.

    RULES:
    1. Be very strict. 100 is like somewhat hard to get not too strict.
    2. Ignore conversational fluff in the user's input.
    3. Return ONLY: {"score": number, "reason": "text"} like a json renderer let the reason be very short like 1 line
  `;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${api}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: body }]
    })
  });
  const data = await response.json();
  return data.choices[0]?.message?.content ;
}


const submit1= async(name,ip,qno,submission)=>{
    try{
        const Query="CALL SUBMIT1($1,$2,$3,$4,$5,$6)";
        const score_reason=await calc(r1_questions[qno].prompt, submission, r1_questions[qno].is_image_task, r1_questions[qno].Result);
        const {score, reason} = JSON.parse(score_reason);
        const values=[name, ip, qno, submission, score, reason];
        await pool.query(Query, values);
        console.log("Submission recorded successfully.");
    }
    catch(err){
        console.error("Error:", err);
    }
}


const submit2= async(name,ip,qno,submission)=>{
    try{
        const Query="CALL SUBMIT2($1,$2,$3,$4,$5,$6)";
        const score_reason=await calc(r2_questions[qno].prompt, submission, r2_questions[qno].is_image_task, r2_questions[qno].Result);
        const {score, reason} = JSON.parse(score_reason);
        const values=[name, ip, qno, submission, score, reason];
        await pool.query(Query, values);
        console.log("Submission recorded successfully.");
    }
    catch(err){
        console.error("Error:", err);
    }

}

const leaderboard = async (tablename) => {
    try {
        const query = `SELECT get_leaderboard($1) AS data`;
        const res = await pool.query(query, [tablename]);
        return res.rows[0]?.data || [];
    }
    catch (err) {
        console.error("Leaderboard Error:", err.message);
        return [];
    }
}

//leaderboard('r1').then(data => console.log("Round 1 Leaderboard:", JSON.stringify(data, null, 2)));
//leaderboard('r2').then(data => console.log("Round 2 Leaderboard:", JSON.stringify(data, null, 2)));

//submit1("Alice","192.2.12.1",1,"A robot in a neon-lit city discovers love through unexpected connections.");
//submit2("Bob","11.1.1.1",1,"create a futuristic cityscape with neon lights, flying cars, towering skyscrapers, and a robot with expressive eyes looking at the skyline, cyberpunk aesthetics, high detail, vibrant colors");

export { submit1, submit2, leaderboard };

