const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// Allow large JSON payloads (for Base64 images)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'quizstack.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Error:", err);
    else console.log("Connected to SQLite:", dbPath);
});

// --------------------
// CREATE TABLES
// --------------------
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstname TEXT,
        middlename TEXT,
        lastname TEXT,
        email TEXT UNIQUE,
        password TEXT,
        profilePicture TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS unlockedLevels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER,
        mode TEXT,
        level INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER,
        mode TEXT,
        level INTEGER,
        score TEXT,
        date TEXT,
        answer TEXT
    )`);
});

// --------------------
// REGISTER
// --------------------
app.post("/register", (req,res)=>{
    const {firstName,middleName,surname,email,password} = req.body;
    if(!email || !password || !firstName || !surname){
        return res.json({success:false, message:"All fields required"});
    }

    db.run(
        `INSERT INTO accounts (firstname,middlename,lastname,email,password)
         VALUES (?,?,?,?,?)`,
        [firstName,middleName,surname,email,password],
        function(err){
            if(err){
                console.error("Register error:", err);
                return res.json({success:false, message:"Email already exists"});
            }

            // Unlock first level for easy mode
            db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`,
                [this.lastID,"easy",1],
                (err2)=> { if(err2) console.error(err2); }
            );

            res.json({success:true, userId:this.lastID});
        }
    );
});

// --------------------
// LOGIN
// --------------------
app.post("/login",(req,res)=>{
    const {email,password} = req.body;
    db.get(`SELECT * FROM accounts WHERE email=? AND password=?`, [email,password], (err,row)=>{
        if(err){
            console.error("Login error:", err);
            return res.json({success:false, message:"Database error"});
        }
        if(!row) return res.json({success:false, message:"Invalid email or password"});
        res.json({success:true, user:row});
    });
});

// --------------------
// GET USER INFO
// --------------------
app.get("/user/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT firstname,middlename,lastname,email FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err) return res.json({success:false});
        if(!row) return res.json({success:false, message:"User not found"});
        res.json({
            success:true,
            user:{
                firstName:row.firstname,
                middleName:row.middlename,
                surname:row.lastname,
                email:row.email
            }
        });
    });
});

// --------------------
// UPDATE USER INFO
// --------------------
app.post("/updateUser",(req,res)=>{
    const {oldEmail,firstName,middleName,surname,email} = req.body;
    db.run(
        `UPDATE accounts SET firstname=?,middlename=?,lastname=?,email=? WHERE email=?`,
        [firstName,middleName,surname,email,oldEmail],
        (err)=>{
            if(err) return res.json({success:false});
            res.json({success:true});
        }
    );
});

// --------------------
// PROFILE PICTURE
// --------------------
app.get("/profile/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT profilePicture FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        res.json({success:true, image:row.profilePicture});
    });
});

app.post("/updateProfilePicture",(req,res)=>{
    const {email,image} = req.body;
    db.run(`UPDATE accounts SET profilePicture=? WHERE email=?`, [image,email], (err)=>{
        if(err) return res.json({success:false});
        res.json({success:true});
    });
});

// --------------------
// USER LEVELS
// --------------------
app.get("/userLevels/:email/:mode",(req,res)=>{
    const email = req.params.email;
    const mode = req.params.mode;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.all(`SELECT level FROM unlockedLevels WHERE accountId=? AND mode=?`, [accountId,mode], (err2,rows)=>{
            if(err2) return res.json({success:false});
            const levels = rows.map(r=>r.level);
            res.json({success:true, levels});
        });
    });
});

// --------------------
// UNLOCK LEVEL
// --------------------
app.post("/unlockLevel",(req,res)=>{
    const {email,mode,level} = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.get(`SELECT * FROM unlockedLevels WHERE accountId=? AND mode=? AND level=?`, [accountId,mode,level], (err2,row2)=>{
            if(err2) return res.json({success:false});
            if(row2) return res.json({success:true});

            db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`, [accountId,mode,level], (err3)=>{
                if(err3) return res.json({success:false});
                res.json({success:true});
            });
        });
    });
});

// --------------------
// SAVE ANSWER
// --------------------
app.post("/saveAnswer",(req,res)=>{
    const {email,mode,level,answer,correct} = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.run(
            `INSERT INTO quizHistory (accountId,mode,level,score,date,answer) VALUES (?,?,?,?,?,?)`,
            [accountId,mode,level,correct?"Correct":"Incorrect",new Date().toLocaleString(),answer],
            (err2)=>{
                if(err2) return res.json({success:false});

                // After saving, check if next difficulty should unlock
                const nextDifficultyMap = { easy: "medium", medium: "hard" };
                const totalLevelsMap = { easy: 20, medium: 20 }; // adjust if needed

                if(nextDifficultyMap[mode]){
                    const nextMode = nextDifficultyMap[mode];
                    const totalLevels = totalLevelsMap[mode];

                    db.all(`SELECT DISTINCT level FROM unlockedLevels WHERE accountId=? AND mode=?`, [accountId,mode], (err3, rows)=>{
                        if(!err3 && rows.length >= totalLevels){
                            // unlock first level of next difficulty if not unlocked
                            db.get(`SELECT * FROM unlockedLevels WHERE accountId=? AND mode=? AND level=1`, [accountId,nextMode], (err4,row4)=>{
                                if(!row4){
                                    db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`, [accountId,nextMode,1]);
                                }
                            });
                        }
                    });
                }

                res.json({success:true});
            }
        );
    });
});

// --------------------
// GET QUIZ HISTORY
// --------------------
app.get("/quizHistory/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.all(`SELECT mode,level,score,date FROM quizHistory WHERE accountId=?`, [accountId], (err2,rows)=>{
            if(err2) return res.json({success:false});
            res.json({success:true, history:rows});
        });
    });
});

const PORT = process.env.PORT || 3000;
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// Allow large JSON payloads (for Base64 images)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'quizstack.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Error:", err);
    else console.log("Connected to SQLite:", dbPath);
});

// --------------------
// CREATE TABLES
// --------------------
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstname TEXT,
        middlename TEXT,
        lastname TEXT,
        email TEXT UNIQUE,
        password TEXT,
        profilePicture TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS unlockedLevels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER,
        mode TEXT,
        level INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER,
        mode TEXT,
        level INTEGER,
        score TEXT,
        date TEXT,
        answer TEXT
    )`);
});

// --------------------
// REGISTER
// --------------------
app.post("/register", (req,res)=>{
    const {firstName,middleName,surname,email,password} = req.body;
    if(!email || !password || !firstName || !surname){
        return res.json({success:false, message:"All fields required"});
    }

    db.run(
        `INSERT INTO accounts (firstname,middlename,lastname,email,password)
         VALUES (?,?,?,?,?)`,
        [firstName,middleName,surname,email,password],
        function(err){
            if(err){
                console.error("Register error:", err);
                return res.json({success:false, message:"Email already exists"});
            }

            // Unlock first level for easy mode
            db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`,
                [this.lastID,"easy",1],
                (err2)=> { if(err2) console.error(err2); }
            );

            res.json({success:true, userId:this.lastID});
        }
    );
});

// --------------------
// LOGIN
// --------------------
app.post("/login",(req,res)=>{
    const {email,password} = req.body;
    db.get(`SELECT * FROM accounts WHERE email=? AND password=?`, [email,password], (err,row)=>{
        if(err){
            console.error("Login error:", err);
            return res.json({success:false, message:"Database error"});
        }
        if(!row) return res.json({success:false, message:"Invalid email or password"});
        res.json({success:true, user:row});
    });
});

// --------------------
// GET USER INFO
// --------------------
app.get("/user/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT firstname,middlename,lastname,email FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err) return res.json({success:false});
        if(!row) return res.json({success:false, message:"User not found"});
        res.json({
            success:true,
            user:{
                firstName:row.firstname,
                middleName:row.middlename,
                surname:row.lastname,
                email:row.email
            }
        });
    });
});

// --------------------
// UPDATE USER INFO
// --------------------
app.post("/updateUser",(req,res)=>{
    const {oldEmail,firstName,middleName,surname,email} = req.body;
    db.run(
        `UPDATE accounts SET firstname=?,middlename=?,lastname=?,email=? WHERE email=?`,
        [firstName,middleName,surname,email,oldEmail],
        (err)=>{
            if(err) return res.json({success:false});
            res.json({success:true});
        }
    );
});

// --------------------
// PROFILE PICTURE
// --------------------
app.get("/profile/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT profilePicture FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        res.json({success:true, image:row.profilePicture});
    });
});

app.post("/updateProfilePicture",(req,res)=>{
    const {email,image} = req.body;
    db.run(`UPDATE accounts SET profilePicture=? WHERE email=?`, [image,email], (err)=>{
        if(err) return res.json({success:false});
        res.json({success:true});
    });
});

// --------------------
// USER LEVELS
// --------------------
app.get("/userLevels/:email/:mode",(req,res)=>{
    const email = req.params.email;
    const mode = req.params.mode;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.all(`SELECT level FROM unlockedLevels WHERE accountId=? AND mode=?`, [accountId,mode], (err2,rows)=>{
            if(err2) return res.json({success:false});
            const levels = rows.map(r=>r.level);
            res.json({success:true, levels});
        });
    });
});

// --------------------
// UNLOCK LEVEL
// --------------------
app.post("/unlockLevel",(req,res)=>{
    const {email,mode,level} = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.get(`SELECT * FROM unlockedLevels WHERE accountId=? AND mode=? AND level=?`, [accountId,mode,level], (err2,row2)=>{
            if(err2) return res.json({success:false});
            if(row2) return res.json({success:true});

            db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`, [accountId,mode,level], (err3)=>{
                if(err3) return res.json({success:false});
                res.json({success:true});
            });
        });
    });
});

// --------------------
// SAVE ANSWER
// --------------------
app.post("/saveAnswer",(req,res)=>{
    const {email,mode,level,answer,correct} = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.run(
            `INSERT INTO quizHistory (accountId,mode,level,score,date,answer) VALUES (?,?,?,?,?,?)`,
            [accountId,mode,level,correct?"Correct":"Incorrect",new Date().toLocaleString(),answer],
            (err2)=>{
                if(err2) return res.json({success:false});

                // After saving, check if next difficulty should unlock
                const nextDifficultyMap = { easy: "medium", medium: "hard" };
                const totalLevelsMap = { easy: 20, medium: 20 }; // adjust if needed

                if(nextDifficultyMap[mode]){
                    const nextMode = nextDifficultyMap[mode];
                    const totalLevels = totalLevelsMap[mode];

                    db.all(`SELECT DISTINCT level FROM unlockedLevels WHERE accountId=? AND mode=?`, [accountId,mode], (err3, rows)=>{
                        if(!err3 && rows.length >= totalLevels){
                            // unlock first level of next difficulty if not unlocked
                            db.get(`SELECT * FROM unlockedLevels WHERE accountId=? AND mode=? AND level=1`, [accountId,nextMode], (err4,row4)=>{
                                if(!row4){
                                    db.run(`INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`, [accountId,nextMode,1]);
                                }
                            });
                        }
                    });
                }

                res.json({success:true});
            }
        );
    });
});

// --------------------
// GET QUIZ HISTORY
// --------------------
app.get("/quizHistory/:email",(req,res)=>{
    const email = req.params.email;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err,row)=>{
        if(err || !row) return res.json({success:false});
        const accountId = row.id;

        db.all(`SELECT mode,level,score,date FROM quizHistory WHERE accountId=?`, [accountId], (err2,rows)=>{
            if(err2) return res.json({success:false});
            res.json({success:true, history:rows});
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server running on http://localhost:"+PORT));
