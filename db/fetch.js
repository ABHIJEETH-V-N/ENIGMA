import { Pool } from "pg";

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'forge',
  password: 'Event5790$',
  port: 5432,
  max: 20,   
});

const fetch=async(res,query)=>{ 
    try{
        const result=await pool.query(query);
        const data=result.rows;
        res.end(JSON.stringify(data));
    }
    catch(err){
        console.log(err);
    }
}


export default fetch;