import pool from "../config/db.js"
class ElectionResulM{
    async createTable(){
        try{
        let sql=
        `Create Table If not EXISTS ElectionResults (
        id SERIAL PRIMARY KEY,
        candidateConstituencyId INTEGER REFERENCES candidateConstituency(id),
        totalVotes INTEGER DEFAULT 0,
        Finalized Date DEFAULT CURRENT_DATE,
        UNIQUE(candidateConstituencyId));`
        await pool.query(sql);
        console.log("ElectionResults table created or already exists.");
    }catch(err){
        console.error("Error creating ElectionResults table:", err);


    }

}

}


export default new ElectionResulM();