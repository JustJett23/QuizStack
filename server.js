const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

/* DATABASE */

const dbPath = path.join(__dirname, 'quizstack.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log("Connected to SQLite:", dbPath);
    }
});

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
        level INTEGER,
        UNIQUE(accountId,mode,level)
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

/* REGISTER */

app.post("/register", (req, res) => {

    const { firstName, middleName, surname, email, password } = req.body;

    if (!firstName || !surname || !email || !password) {
        return res.json({ success: false, message: "All fields required" });
    }

    db.run(
        `INSERT INTO accounts (firstname,middlename,lastname,email,password)
         VALUES (?,?,?,?,?)`,
        [firstName, middleName, surname, email, password],
        function (err) {

            if (err) {
                console.error("Register error:", err);
                return res.json({ success: false, message: "Email already exists" });
            }

            db.run(
                `INSERT INTO unlockedLevels (accountId,mode,level)
                 VALUES (?,?,?)`,
                [this.lastID, "easy", 1]
            );

            res.json({ success: true, userId: this.lastID });

        }
    );

});

/* LOGIN */

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    db.get(
        `SELECT * FROM accounts WHERE email=? AND password=?`,
        [email, password],
        (err, row) => {

            if (err) {
                console.error("Login error:", err);
                return res.json({ success: false });
            }

            if (!row) {
                return res.json({ success: false, message: "Invalid email or password" });
            }

            res.json({ success: true, user: row });

        }
    );

});

/* GET USER INFO */

app.get("/user/:email", (req, res) => {

    const email = req.params.email;

    db.get(
        `SELECT firstname,middlename,lastname,email
         FROM accounts WHERE email=?`,
        [email],
        (err, row) => {

            if (err || !row) {
                return res.json({ success: false });
            }

            res.json({
                success: true,
                user: {
                    firstName: row.firstname,
                    middleName: row.middlename,
                    surname: row.lastname,
                    email: row.email
                }
            });

        }
    );

});

/* UPDATE USER */

app.post("/updateUser", (req, res) => {

    const { oldEmail, firstName, middleName, surname, email } = req.body;

    db.run(
        `UPDATE accounts
         SET firstname=?, middlename=?, lastname=?, email=?
         WHERE email=?`,
        [firstName, middleName, surname, email, oldEmail],
        function (err) {

            if (err) {
                console.error("Update user error:", err);
                return res.json({ success: false });
            }

            res.json({ success: true });

        }
    );

});

/* PROFILE IMAGE */

app.get("/profile/:email", (req, res) => {

    const email = req.params.email;

    db.get(
        `SELECT profilePicture FROM accounts WHERE email=?`,
        [email],
        (err, row) => {

            if (err || !row) {
                return res.json({ success: false });
            }

            res.json({
                success: true,
                image: row.profilePicture || null
            });

        }
    );

});

app.post("/updateProfilePicture", (req, res) => {

    const { email, image } = req.body;

    if (!email || !image) {
        return res.json({ success: false, message: "Missing email or image" });
    }

    db.run(
        `UPDATE accounts SET profilePicture=? WHERE email=?`,
        [image, email],
        function (err) {

            if (err) {
                console.error("Profile update error:", err);
                return res.json({ success: false });
            }

            if (this.changes === 0) {
                return res.json({ success: false, message: "User not found" });
            }

            res.json({ success: true });

        }
    );

});

/* USER LEVELS */

app.get("/userLevels/:email/:mode", (req, res) => {

    const { email, mode } = req.params;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {

        if (err || !row) return res.json({ success: false });

        const accountId = row.id;

        db.all(
            `SELECT level FROM unlockedLevels
             WHERE accountId=? AND mode=?`,
            [accountId, mode],
            (err2, rows) => {

                if (err2) return res.json({ success: false });

                const levels = rows.map(r => r.level);

                res.json({ success: true, levels });

            }
        );

    });

});

/* UNLOCK LEVEL */

app.post("/unlockLevel", (req, res) => {

    const { email, mode, level } = req.body;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {

        if (err || !row) return res.json({ success: false });

        const accountId = row.id;

        db.run(
            `INSERT OR IGNORE INTO unlockedLevels (accountId,mode,level)
             VALUES (?,?,?)`,
            [accountId, mode, level],
            (err2) => {

                if (err2) return res.json({ success: false });

                res.json({ success: true });

            }
        );

    });

});

/* SAVE ANSWERS */

app.post("/saveAnswer", (req, res) => {

    const { email, mode, level, answer, correct } = req.body;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {

        if (err || !row) return res.json({ success: false });

        const accountId = row.id;

        db.run(
            `INSERT INTO quizHistory
            (accountId,mode,level,score,date,answer)
            VALUES (?,?,?,?,?,?)`,
            [
                accountId,
                mode,
                level,
                correct ? "Correct" : "Incorrect",
                new Date().toLocaleString(),
                answer
            ],
            (err2) => {

                if (err2) return res.json({ success: false });

                res.json({ success: true });

            }
        );

    });

});

/* QUIZ HISTORY */

app.get("/quizHistory/:email", (req, res) => {

    const email = req.params.email;

    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {

        if (err || !row) return res.json({ success: false });

        const accountId = row.id;

        db.all(
            `SELECT mode,level,score,date
             FROM quizHistory
             WHERE accountId=?
             ORDER BY id DESC`,
            [accountId],
            (err2, rows) => {

                if (err2) return res.json({ success: false });

                res.json({ success: true, history: rows });

            }
        );

    });

});

/* ADMIN USERS */

app.get("/admin/users", (req, res) => {
    // Get all accounts first
    db.all(`SELECT * FROM accounts`, [], (err, accounts) => {
        if (err) return res.send("Database error: " + err.message);

        let html = `<h1>Registered Users</h1>`;

        // Loop through accounts to get their levels and quiz history
        const accountPromises = accounts.map(user => {
            return new Promise((resolve) => {
                // Get unlocked levels for this user
                db.all(
                    `SELECT mode, level FROM unlockedLevels WHERE accountId=?`,
                    [user.id],
                    (errLevels, levels) => {
                        if (errLevels) levels = [];

                        // Get quiz history for this user
                        db.all(
                            `SELECT mode, level, score, date, answer FROM quizHistory WHERE accountId=? ORDER BY id DESC`,
                            [user.id],
                            (errQuiz, quiz) => {
                                if (errQuiz) quiz = [];

                                resolve({
                                    user,
                                    levels,
                                    quiz
                                });
                            }
                        );
                    }
                );
            });
        });

        // Wait for all promises to complete
        Promise.all(accountPromises).then(results => {
            results.forEach(data => {
                const user = data.user;
                html += `
                    <h2>${user.firstname} ${user.middlename || ""} ${user.lastname} (ID: ${user.id})</h2>
                    <p>Email: ${user.email}</p>
                    <h3>Unlocked Levels</h3>
                    <table border="1" cellpadding="5">
                        <tr>
                            <th>Mode</th>
                            <th>Level</th>
                        </tr>
                        ${data.levels.map(lv => `<tr><td>${lv.mode}</td><td>${lv.level}</td></tr>`).join('')}
                    </table>
                    <h3>Quiz History</h3>
                    <table border="1" cellpadding="5">
                        <tr>
                            <th>Mode</th>
                            <th>Level</th>
                            <th>Score</th>
                            <th>Date</th>
                            <th>Answer</th>
                        </tr>
                        ${data.quiz.map(q => `<tr><td>${q.mode}</td><td>${q.level}</td><td>${q.score}</td><td>${q.date}</td><td>${q.answer}</td></tr>`).join('')}
                    </table>
                    <hr>
                `;
            });

            res.send(html);
        });
    });
});

/* SERVER */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});
