const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* =====================
   DATABASE
   ===================== */
const dbPath = path.join(__dirname, 'quizstack.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Error:", err);
    else console.log("Connected to SQLite:", dbPath);
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

/* =====================
   REGISTER
   ===================== */
app.post("/register", (req, res) => {
    const { firstName, middleName, surname, email, password } = req.body;
    if (!firstName || !surname || !email || !password)
        return res.json({ success: false, message: "All fields required" });

    db.run(
        `INSERT INTO accounts (firstname,middlename,lastname,email,password)
         VALUES (?,?,?,?,?)`,
        [firstName, middleName, surname, email, password],
        function (err) {
            if (err) return res.json({ success: false, message: "Email already exists" });

            db.run(
                `INSERT INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`,
                [this.lastID, "easy", 1]
            );

            res.json({ success: true, userId: this.lastID });
        }
    );
});

/* =====================
   LOGIN
   ===================== */
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.get(
        `SELECT * FROM accounts WHERE email=? AND password=?`,
        [email, password],
        (err, row) => {
            if (err) return res.json({ success: false });
            if (!row) return res.json({ success: false, message: "Invalid email or password" });
            res.json({ success: true, user: row });
        }
    );
});

/* =====================
   GET / UPDATE USER INFO
   ===================== */
app.get("/user/:email", (req, res) => {
    const email = req.params.email;
    db.get(
        `SELECT firstname,middlename,lastname,email FROM accounts WHERE email=?`,
        [email],
        (err, row) => {
            if (err || !row) return res.json({ success: false });
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

app.post("/updateUser", (req, res) => {
    const { oldEmail, firstName, middleName, surname, email } = req.body;
    db.run(
        `UPDATE accounts SET firstname=?, middlename=?, lastname=?, email=? WHERE email=?`,
        [firstName, middleName, surname, email, oldEmail],
        function (err) {
            if (err) return res.json({ success: false, message: err.message });
            if (this.changes === 0) return res.json({ success: false, message: "No user updated" });
            res.json({ success: true });
        }
    );
});

/* =====================
   PROFILE IMAGE
   ===================== */
app.get("/profile/:email", (req, res) => {
    const email = req.params.email;
    db.get(
        `SELECT profilePicture FROM accounts WHERE email=?`,
        [email],
        (err, row) => {
            if (err || !row) return res.json({ success: false });
            res.json({ success: true, image: row.profilePicture || null });
        }
    );
});

app.post("/updateProfilePicture", (req, res) => {
    const { email, image } = req.body;
    if (!email || !image) return res.json({ success: false, message: "Missing email or image" });

    db.run(
        `UPDATE accounts SET profilePicture=? WHERE email=?`,
        [image, email],
        function (err) {
            if (err) return res.json({ success: false, message: err.message });
            if (this.changes === 0) return res.json({ success: false, message: "User not found" });
            res.json({ success: true });
        }
    );
});

/* =====================
   USER LEVELS
   ===================== */
app.get("/userLevels/:email/:mode", (req, res) => {
    const { email, mode } = req.params;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {
        if (err || !row) return res.json({ success: false });
        const accountId = row.id;

        db.all(`SELECT level FROM unlockedLevels WHERE accountId=? AND mode=?`, [accountId, mode], (err2, rows) => {
            if (err2) return res.json({ success: false });
            const levels = rows.map(r => r.level);
            res.json({ success: true, levels });
        });
    });
});

app.post("/unlockLevel", (req, res) => {
    const { email, mode, level } = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {
        if (err || !row) return res.json({ success: false });
        const accountId = row.id;
        db.run(
            `INSERT OR IGNORE INTO unlockedLevels (accountId,mode,level) VALUES (?,?,?)`,
            [accountId, mode, level],
            (err2) => {
                if (err2) return res.json({ success: false });
                res.json({ success: true });
            }
        );
    });
});

/* =====================
   SAVE ANSWERS
   ===================== */
app.post("/saveAnswer", (req, res) => {
    const { email, mode, level, answer, correct } = req.body;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {
        if (err || !row) return res.json({ success: false });
        const accountId = row.id;

        db.run(
            `INSERT INTO quizHistory (accountId,mode,level,score,date,answer) VALUES (?,?,?,?,?,?)`,
            [accountId, mode, level, correct ? "Correct" : "Incorrect", new Date().toLocaleString(), answer],
            (err2) => {
                if (err2) return res.json({ success: false });
                res.json({ success: true });
            }
        );
    });
});

/* =====================
   QUIZ HISTORY
   ===================== */
app.get("/quizHistory/:email", (req, res) => {
    const email = req.params.email;
    db.get(`SELECT id FROM accounts WHERE email=?`, [email], (err, row) => {
        if (err || !row) return res.json({ success: false });
        const accountId = row.id;

        db.all(
            `SELECT mode,level,score,date,answer FROM quizHistory WHERE accountId=? ORDER BY id DESC`,
            [accountId],
            (err2, rows) => {
                if (err2) return res.json({ success: false });
                res.json({ success: true, history: rows });
            }
        );
    });
});

/* =====================
   ADMIN DASHBOARD + CRUD
   ===================== */
app.get("/admin/users", (req, res) => {
    db.all(`SELECT * FROM accounts`, [], (err, accounts) => {
        if (err) return res.send("Database error: " + err.message);

        let html = `
        <html>
        <head>
            <title>Admin Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f4f4f9; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);}
                th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
                th { background-color: #4CAF50; color: white; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tr:hover { background-color: #f1f1f1; }
                input[type="text"], input[type="email"], input[type="number"] { width: 90%; padding: 5px; border: 1px solid #ccc; border-radius: 3px; }
                button { padding: 5px 10px; border: none; border-radius: 3px; background-color: #4CAF50; color: white; cursor: pointer; margin: 2px; }
                button:hover { background-color: #45a049; }
                form { display: inline; }
                .section { margin-bottom: 50px; }
            </style>
        </head>
        <body>
        `;

        // USERS
        html += `<div class="section"><h1>Users</h1>
            <table>
                <tr>
                    <th>ID</th>
                    <th>First Name</th>
                    <th>Middle</th>
                    <th>Last</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>`;

        accounts.forEach(user => {
            html += `
                <tr>
                    <form method="POST" action="/admin/updateUser">
                        <td>${user.id}<input type="hidden" name="id" value="${user.id}"></td>
                        <td><input type="text" name="firstName" value="${user.firstname}"></td>
                        <td><input type="text" name="middleName" value="${user.middlename || ''}"></td>
                        <td><input type="text" name="surname" value="${user.lastname}"></td>
                        <td>
                            <input type="email" name="email" value="${user.email}">
                            <input type="hidden" name="oldEmail" value="${user.email}">
                        </td>
                        <td>
                            <button type="submit">Update</button>
                    </form>
                            <form method="POST" action="/admin/deleteUser">
                                <input type="hidden" name="email" value="${user.email}">
                                <button type="submit">Delete</button>
                            </form>
                        </td>
                </tr>
            `;
        });
        html += `</table></div>`;

        // UNLOCKED LEVELS
        db.all(`SELECT ul.id, ul.accountId, a.email, ul.mode, ul.level 
                FROM unlockedLevels ul JOIN accounts a ON ul.accountId = a.id`, [], (err2, levels) => {

            html += `<div class="section"><h2>Unlocked Levels</h2>
            <table>
                <tr>
                    <th>ID</th>
                    <th>User Email</th>
                    <th>Mode</th>
                    <th>Level</th>
                    <th>Actions</th>
                </tr>`;

            levels.forEach(lv => {
                html += `
                    <tr>
                        <form method="POST" action="/admin/updateLevel">
                            <td>${lv.id}<input type="hidden" name="id" value="${lv.id}"></td>
                            <td>${lv.email}</td>
                            <td><input type="text" name="mode" value="${lv.mode}"></td>
                            <td><input type="number" name="level" value="${lv.level}"></td>
                            <td>
                                <button type="submit">Update</button>
                        </form>
                                <form method="POST" action="/admin/deleteLevel">
                                    <input type="hidden" name="id" value="${lv.id}">
                                    <button type="submit">Delete</button>
                                </form>
                            </td>
                    </tr>`;
            });

            html += `</table></div>`;

            // QUIZ HISTORY
            db.all(`SELECT qh.id, qh.accountId, a.email, qh.mode, qh.level, qh.score, qh.date, qh.answer 
                    FROM quizHistory qh JOIN accounts a ON qh.accountId = a.id`, [], (err3, quiz) => {

                html += `<div class="section"><h2>Quiz History</h2>
                <table>
                    <tr>
                        <th>ID</th>
                        <th>User Email</th>
                        <th>Mode</th>
                        <th>Level</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Answer</th>
                        <th>Actions</th>
                    </tr>`;

                quiz.forEach(q => {
                    html += `
                        <tr>
                            <form method="POST" action="/admin/updateQuiz">
                                <td>${q.id}<input type="hidden" name="id" value="${q.id}"></td>
                                <td>${q.email}</td>
                                <td><input type="text" name="mode" value="${q.mode}"></td>
                                <td><input type="number" name="level" value="${q.level}"></td>
                                <td><input type="text" name="score" value="${q.score}"></td>
                                <td><input type="text" name="date" value="${q.date}"></td>
                                <td><input type="text" name="answer" value='${q.answer}'></td>
                                <td>
                                    <button type="submit">Update</button>
                            </form>
                                    <form method="POST" action="/admin/deleteQuiz">
                                        <input type="hidden" name="id" value="${q.id}">
                                        <button type="submit">Delete</button>
                                    </form>
                                </td>
                        </tr>`;
                });

                html += `</table></div></body></html>`;
                res.send(html);
            });
        });
    });
});

/* =====================
   ADMIN CRUD ROUTES
   ===================== */

/* --- ACCOUNTS --- */
app.post("/admin/updateUser", (req, res) => {
    const { oldEmail, firstName, middleName, surname, email } = req.body;
    db.run(
        `UPDATE accounts SET firstname=?, middlename=?, lastname=?, email=? WHERE email=?`,
        [firstName, middleName, surname, email, oldEmail],
        function(err) {
            if (err) return res.json({ success: false, message: err.message });
            if (this.changes === 0) return res.json({ success: false, message: "No rows updated" });
            res.json({ success: true });
        }
    );
});

app.post("/admin/deleteUser", (req, res) => {
    const { email } = req.body;
    db.run(`DELETE FROM accounts WHERE email=?`, [email], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

/* --- UNLOCKED LEVELS --- */
app.post("/admin/updateLevel", (req, res) => {
    const { id, mode, level } = req.body;
    db.run(`UPDATE unlockedLevels SET mode=?, level=? WHERE id=?`, [mode, level, id], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        if (this.changes === 0) return res.json({ success: false, message: "No rows updated" });
        res.json({ success: true });
    });
});

app.post("/admin/deleteLevel", (req, res) => {
    const { id } = req.body;
    db.run(`DELETE FROM unlockedLevels WHERE id=?`, [id], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

/* --- QUIZ HISTORY --- */
app.post("/admin/updateQuiz", (req, res) => {
    const { id, mode, level, score, date, answer } = req.body;
    db.run(
        `UPDATE quizHistory SET mode=?, level=?, score=?, date=?, answer=? WHERE id=?`,
        [mode, level, score, date, answer, id],
        function(err) {
            if (err) return res.json({ success: false, message: err.message });
            if (this.changes === 0) return res.json({ success: false, message: "No rows updated" });
            res.json({ success: true });
        }
    );
});

app.post("/admin/deleteQuiz", (req, res) => {
    const { id } = req.body;
    db.run(`DELETE FROM quizHistory WHERE id=?`, [id], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

/* =====================
   SERVER
   ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
