const API = window.location.origin;

(function() {
    const sparkleContainer = document.createElement("div");
    sparkleContainer.id = "sparkle-container";
    document.body.appendChild(sparkleContainer);

    function createSparkles(amount) {
        for (let i = 0; i < amount; i++) {
            const sp = document.createElement("div");
            sp.classList.add("sparkle");

            // random position (spread across full screen)
            sp.style.top = Math.random() * window.innerHeight + "px";
            sp.style.left = Math.random() * window.innerWidth + "px";

            // random size scaling (keeps shape but changes size)
            const scale = Math.random() * 1.2 + 0.6;

            // random rotate at start
            const rotate = Math.random() * 360;
            sp.style.rotate = rotate + "deg";

            // random opacity
            sp.style.opacity = Math.random() * 0.6 + 0.4;

            // random animation speed
            sp.style.animationDuration = (Math.random() * 2 + 1.5) + "s";

            // random animation delay so they twinkle differently
            sp.style.animationDelay = Math.random() * 3 + "s";

            sparkleContainer.appendChild(sp);
            sparkleContainer.style.pointerEvents = "none";
        }
    }

    const isMobile = window.innerWidth <= 768;
    createSparkles(isMobile ? 30 : 80);

})();

document.querySelectorAll(".toggle-password").forEach(icon => {
    icon.addEventListener("click", () => {
        // Find the input inside the same login__box
        const wrapper = icon.closest(".login__box");
        const input = wrapper.querySelector("input");
        if (!input) return;

        // Toggle input type
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    });
});





function Register() {      
    if (document.getElementById("loginAccessRegister").classList.contains("active")) {
    document.getElementById("loginAccessRegister").classList.remove("active");
    clearLoginForm();
} else {
    document.getElementById("loginAccessRegister").classList.add("active");
    }
    clearLoginForm();
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();

    let loginEmail = document.getElementById('Loginemail2').value;
    let loginPassword = document.getElementById('Loginpassword').value;

    (fetch(`${API}/login`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: loginEmail,
            password: loginPassword
        })
    })
    .then(res => res.json())
    .then(data => {

        if (!data.success) {
            alert("Invalid email or password.");
            clearLoginForm();
            return;
        }

        let account = data.user;

        localStorage.setItem('loggedInUser', JSON.stringify(account));

        if (account.email === "admin@example.com") {
            window.location.href = "admin.html";
        } else {
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = "Dashboard.html";
        }

    })
    .catch(err => {
        console.error(err);
        alert("Server error.");
    });
}

function handleCreateAccount(event) {
    event.preventDefault();

    let email = document.getElementById('email').value;
    let password = document.getElementById('passwordCreate').value;
    let firstName = document.getElementById('firstname').value;
    let surname = document.getElementById('lastname').value;
    let middleName = document.getElementById('middlename').value;

    (fetch(`${API}/register`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password,
            firstName: firstName,
            middleName: middleName,
            surname: surname
        })
    })
    .then(res => res.json())
    .then(data => {

        if (!data.success) {
            alert("Account already exists.");
            clearCreateAccount();
            return;
        }

        alert("Account created successfully.");
        window.location.href = "index.html";

    })
    .catch(err => {
        console.error(err);
        alert("Server error.");
    });
}

function clearLoginForm() {
    let form = document.getElementById('login__form');
    if (form) form.reset();
}

function clearCreateAccount() {
    let form = document.getElementById('createAccount');
    if (form) form.reset();
}

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    const captureButton = document.getElementById('capture');
    const confirmButton = document.getElementById('confirm');
    const editProfileButton = document.getElementById('edit-profile');
    const ctx = canvas.getContext('2d');

    let stream = null;
    let isCaptured = false;
    let capturedImage = null;

    let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));


    async function loadSavedProfilePicture(){

        if(!loggedInUser) return;

        const res = await fetch(`http://localhost:3000/profile/${loggedInUser.email}`);
        const data = await res.json();

        if(!data.success) return;

        let img = new Image();
        img.src = data.image;

        img.onload = () => {

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img,0,0,canvas.width,canvas.height);

            video.style.display = "none";
            canvas.style.display = "block";

            captureButton.style.display = "none";
            confirmButton.style.display = "none";
            editProfileButton.style.display = "block";

        };

    }

    loadSavedProfilePicture();


    async function startCamera(){

        try{

            if(stream){
                stream.getTracks().forEach(track => track.stop());
            }

            stream = await navigator.mediaDevices.getUserMedia({
                video:{facingMode:"user"}
            });

            video.srcObject = stream;

            video.style.display="block";
            canvas.style.display="none";

            captureButton.style.display="block";
            confirmButton.style.display="none";
            editProfileButton.style.display="none";

            isCaptured=false;

            video.onloadedmetadata = () => {

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const maxWidth = 360;

                if(video.videoWidth > maxWidth){

                    const ratio = video.videoHeight / video.videoWidth;

                    canvas.width = maxWidth;
                    canvas.height = maxWidth * ratio;

                }

            };

        }
        catch(error){

            console.error(error);
            alert("Camera permission denied.");

        }

    }

    editProfileButton.addEventListener("click",startCamera);


    captureButton.addEventListener("click",()=>{

        if(!isCaptured){

            ctx.drawImage(video,0,0,canvas.width,canvas.height);

            capturedImage = canvas.toDataURL("image/png");

            video.style.display="none";
            canvas.style.display="block";

            captureButton.textContent="Recapture";
            confirmButton.style.display="block";

            isCaptured=true;

        }
        else{

            isCaptured=false;
            startCamera();

            captureButton.textContent="Capture Image";
            confirmButton.style.display="none";

        }

    });


    confirmButton.addEventListener("click",async ()=>{

        if(!capturedImage || !loggedInUser) return;

        const res = await fetch("http://localhost:3000/updateProfilePicture",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                email:loggedInUser.email,
                image:capturedImage

            })

        });

        const data = await res.json();

        if(!data.success){
            alert("Failed to save profile picture.");
            return;
        }

        captureButton.style.display="none";
        confirmButton.style.display="none";

        editProfileButton.style.display="block";
        editProfileButton.textContent="Edit Profile";

    });

});

async function loadAccountSettings() {

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) return;

    try {

        const res = await fetch(`http://localhost:3000/user/${loggedInUser.email}`);
        const data = await res.json();

        if (!data.success) return;

        const user = data.user;

        function setValue(id, value) {
            const el = document.getElementById(id);
            if (el) el.value = value || "";
        }

        setValue("username", user.firstName);
        setValue("first-name", user.firstName);
        setValue("middle-name", user.middleName);
        setValue("last-name", user.surname);
        setValue("emailAdd", user.email);

    } catch (error) {
        console.error("Failed to load account settings:", error);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadAccountSettings();
});


document.addEventListener("DOMContentLoaded", () => {

    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");

    const inputs = [
        document.getElementById("first-name"),
        document.getElementById("middle-name"),
        document.getElementById("last-name"),
        document.getElementById("emailAdd")
    ];


    editBtn.addEventListener("click", () => {

        let isDisabled = inputs[0].disabled;

        if (isDisabled) {

            inputs.forEach(input => input.disabled = false);
            editBtn.textContent = "Lock ✎";
            saveBtn.style.display = "flex";

        } else {

            inputs.forEach(input => input.disabled = true);
            editBtn.textContent = "Edit ✎";

        }

    });


    saveBtn.addEventListener("click", async () => {

        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser) return;

        const updatedData = {
            oldEmail: loggedInUser.email,
            firstName: inputs[0].value,
            middleName: inputs[1].value,
            surname: inputs[2].value,
            email: inputs[3].value
        };

        try {

            const res = await fetch("http://localhost:3000/updateUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedData)
            });

            const data = await res.json();

            if (!data.success) {
                alert("Failed to update account.");
                return;
            }

            localStorage.setItem("loggedInUser", JSON.stringify({
                email: updatedData.email
            }));

            inputs.forEach(input => input.disabled = true);
            editBtn.textContent = "Edit ✎";
            saveBtn.style.display = "none";

            alert("Account info updated successfully!");

        } catch (error) {

            console.error("Update error:", error);
            alert("Server error.");

        }

    });

});


const screens = {
    difficulty: document.querySelector('.difficulty'),
    levels: document.querySelector('.levels'),
    question: document.querySelector('.question')
};

const levelGrid = document.querySelector('.level-grid');
const questionText = document.getElementById('questionText');
const choicesBox = document.querySelector('.choices');

let mode = "";

// --- SCREEN LOCK FOR DELAY ---
let screenLock = false;
const SCREEN_DELAY = 500; // milliseconds

function show(screen) {
    if (screenLock) return;
    screenLock = true;

    Object.values(screens).forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    setTimeout(() => {
        screenLock = false;
    }, SCREEN_DELAY);
}

// --- QUESTIONS ---
// EASY = multiple-choice, MEDIUM/HARD = open-ended
const questions = {
    easy: [
        { q: "1. What does HTML stand for?", c: ["Hyperlinks and Text Markup Language", "Hyper Text Markup Language", "Home Tool Markup Language", "Hyper Tool Management Language"], a: 1 },
        { q: "2. Which tag is used to create a hyperlink in HTML?", c: ["<link>", "<a>", "<href>", "<url>"], a: 1 },
        { q: "3. What tag is used to display an image in HTML?", c: ["<img>", "<picture>", "<src>", "<image>"], a: 0 },
        { q: "4. Which tag is used to create an unordered list?", c: ["<ul>", "<ol>", "<li>", "<list>"], a: 0 },
        { q: "5. What is the correct tag to insert a line break?", c: ["<break>", "<lb>", "<br>", "<newline>"], a: 2 },
        { q: "6. Which attribute is used to provide alternative text for an image?", c: ["src", "alt", "title", "href"], a: 1 },
        { q: "7. What tag is used to define the largest heading in HTML?", c: ["<h6>", "<h1>", "<head>", "<header>"], a: 1 },
        { q: "8. What does CSS stand for?", c: ["Cascading Style Sheets", "Creative Style Syntax", "Computer Style System", "Colorful Style Sheets"], a: 0 },
        { q: "9. Which property is used to change the text color in CSS?", c: ["font-color", "text-color", "color", "background-color"], a: 2 },
        { q: "10. How do you apply a background color to a webpage using CSS?", c: ["background-color: blue;", "bgcolor: blue;", "color: blue;", "background: text;"], a: 0 },
        { q: "11. Which property controls the size of text in CSS?", c: ["font-size", "text-size", "size", "font-style"], a: 0 },
        { q: "12. What is the difference between id and class selectors in CSS?", c: ["id can be used multiple times, class only once", "id is unique, class can be reused", "Both are always unique", "Both can be reused infinitely"], a: 1 },
        { q: "13. Which CSS property is used to change the font style?", c: ["font-family", "font-style", "text-style", "font-weight"], a: 0 },
        { q: "14. How do you center text horizontally using CSS?", c: ["align: center;", "text-align: center;", "center: text;", "horizontal-align: center;"], a: 1 },
        { q: "15. What does JavaScript mainly add to a webpage?", c: ["Structure", "Styling", "Interactivity", "Content"], a: 2 },
        { q: "16. Which keyword is used to declare a variable in JavaScript?", c: ["var", "let", "const", "All of the above"], a: 0 },
        { q: "17. How do you write a comment in JavaScript?", c: ["<!—comment", "// comment", "/* comment */", "** comment **"], a: 1 },
        { q: "18. What function is used to display a message in the browser console?", c: ["alert()", "console.log()", "print()", "message()"], a: 1 },
        { q: "19. Which operator is used to compare both value and type in JavaScript?", c: ["==", "=", "===", "!="], a: 2 },
        { q: "20. What is the correct syntax to create a function in JavaScript?", c: ["function myFunction() { }", "func myFunction() { }", "create function myFunction() { }", "function: myFunction() { }"], a: 0 }
    ],

    medium: [
        { q: "Python: Print('Result:' + 5 + 10)\n- What error occurs?\n- Fix the code.", correctAnswers: ["TypeError: cannot concatenate str and int","cannot concatenate string and integer","TypeError due to adding string and number"] },
        { q: "Python: Numbers = [1,2,3,4]; Print(numbers[4])\n- What error occurs?\n- Correct the code.", correctAnswers: ["IndexError: list index out of range","list index out of range"] },
        { q: "Python: For I in range(1,5): Print(i*2)\n- What will be the output?", correctAnswers: ["2 4 6 8","2,4,6,8","outputs 2 4 6 8"] },
        { q: "Python: Student = {“id”:101, “name”:”Ana”}; Print(student[“grade”])\n- What error occurs?\n- Fix the code.", correctAnswers: ["KeyError: 'grade'","grade key error","KeyError"] },
        { q: "Python: Def add(a,b): Return a+b; Print(add(5))\n- What error occurs?\n- Correct the function call.", correctAnswers: ["TypeError: missing 1 required positional argument","TypeError due to missing argument","missing argument error"] },
        { q: "Python: X = [10,20,30]; For I in x: Print(i**2)\n- What will be the output?", correctAnswers: ["100 400 900","outputs 100 400 900","100,400,900"] },
        { q: "Python: Import sqlite3; Conn = sqlite3.connect(“school.db”); Cursor = conn.cursor(); Cursor.execute(“SELECT id, name grade FROM students”)\n- What error occurs?\n- Fix the query.", correctAnswers: ["syntax error in SQL query","missing comma between name and grade","SQL syntax error"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { Int x = 5; System.out.println(“Value: “ + x*2); } }\n- What will be the output?", correctAnswers: ["Value: 10","prints Value: 10","outputs Value: 10"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { String name; System.out.println(“Name: “ + name); } }\n- What error occurs?\n- Fix the code.", correctAnswers: ["variable might not have been initialized","null pointer","compile error"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { Int[] arr = {1,2,3}; System.out.println(arr[3]); } }\n- What error occurs?\n- Correct the code.", correctAnswers: ["ArrayIndexOutOfBoundsException","index out of range","array index error"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { Int a = 10; Int b = 0; System.out.println(a/b); } }\n- What error occurs?\n- Fix the code.", correctAnswers: ["ArithmeticException: divide by zero","divide by zero error","cannot divide by zero"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { String s = “Hello”; System.out.println(s.charAt(10)); } }\n- What error occurs?\n- Correct the code.", correctAnswers: ["StringIndexOutOfBoundsException","index out of range","charAt index error"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { Int id = 101; String name = “Maria”; Int grade = 90; System.out.println(“ID:” + id + “ Name:” + name + “ Grade:” + grade); } }\n- What will be the output?\n- If print statement is outside main, what error occurs?", correctAnswers: ["ID:101 Name:Maria Grade:90","outputs ID:101 Name:Maria Grade:90","outside main error"] },
        { q: "Java: Public class Test { Public static void main(String[] args) { Int x = 5; If(x = 5){ System.out.println(“Equal”); } } }\n- What error occurs?\n- Fix the condition.", correctAnswers: ["cannot assign in if","use == for comparison","compile error"] },
        { q: "PHP: <?php $conn = new mysqli(“localhost”, “root”, “”, “school”); $sql = “SELECT id name, grade FROM students”; $result = $conn->query($sql); ?>\n- What error occurs?\n- Fix the query.", correctAnswers: ["SQL syntax error","missing comma","syntax error in query"] },
        { q: "PHP: <?php $grade = “90”; $sql = “SELECT * FROM students WHERE grade = ‘$grade’”; $result = $conn->query($sql); ?>\n- If grade is INT, what happens?\n- Correct the query.", correctAnswers: ["type mismatch","query error due to type","should cast to int"] },
        { q: "PHP: <?php $sql = “DELETE students WHERE grade < 50”; $conn->query($sql); ?>\n- What error occurs?\n- Correct the query.", correctAnswers: ["SQL syntax error","missing FROM keyword","cannot delete without FROM"] },
        { q: "PHP: <?php $sql = “UPDATE students SET grade = grade + 5”; $conn->query($sql); ?>\n- What will be the outcome?\n- Restrict update to students with grade < 80.", correctAnswers: ["all grades updated","add WHERE grade < 80","restrict to certain grades"] },
        { q: "PHP: <?php $name = “Ana”; Echo “Student: “ + $name; ?>\n- What error occurs?\n- Fix the code.", correctAnswers: ["cannot use + with string","use . for concatenation","syntax error"] },
        { q: "PHP: <?php $numbers = [1,2,3]; Echo $numbers[3]; ?>\n- What error occurs?\n- Correct the code.", correctAnswers: ["undefined offset","index out of range","array index error"] }
    ],

    hard: [
        { q: "HTML: You created a <form> with multiple <input> fields but forgot to add name attributes. What happens when the form is submitted?", correctAnswers: ["Form data will not be sent for inputs without name","no data sent for inputs without name"] },
        { q: "HTML: In a table with <th scope='row'>, explain how screen readers interpret the data differently compared to <th scope='col'>.", correctAnswers: ["row headers read for each cell in row","col headers read for each cell in column","screen reader reads differently for row vs col"] },
        { q: "HTML: Why does embedding an <iframe> without the sandbox attribute pose a security risk?", correctAnswers: ["iframe can run malicious scripts","security risk due to untrusted content","iframe without sandbox is unsafe"] },
        { q: "CSS: Given div { margin: 10px auto; }, why might the element not be centered horizontally?", correctAnswers: ["element must have width defined","not centered without width","auto margin requires width"] },
        { q: "CSS: Predict the output: .container { display: flex; } .item { flex:1; } .item:nth-child(2) { flex:2; } How are items sized?", correctAnswers: ["first item flex 1 second flex 2","second item twice as big","sizes: 1 2"] },
        { q: "CSS: Why does z-index sometimes fail to bring an element to the front, even with a higher value?", correctAnswers: ["element not positioned","z-index only works on positioned elements","position must be relative/absolute/fixed"] },
        { q: "JavaScript: What is the output of: console.log([] == ![]); Explain why.", correctAnswers: ["true","because [] is falsy?","evaluates to true due to coercion"] },
        { q: "JavaScript: Why does setTimeout(()=>console.log('Hi'),0) not run immediately?", correctAnswers: ["event loop","runs after current call stack","asynchronous behavior"] },
        { q: "JavaScript: In ES6, const obj = { a:1 }; obj.a = 2; What happens?", correctAnswers: ["value changes","object properties mutable","a becomes 2"] },
        { q: "JavaScript: Explain why this behaves differently inside an arrow function compared to a regular function.", correctAnswers: ["arrow functions do not have their own this","this is inherited from parent","different binding of this"] },
        { q: "Python: Def f(x=[]): x.append(1); return x; print(f()); print(f()); What is the output?", correctAnswers: ["[1] [1,1]","output is [1] then [1,1]","mutable default argument"] },
        { q: "Python: Why does is behave differently from == when comparing strings or integers?", correctAnswers: ["is checks identity","== checks value","is compares memory address"] },
        { q: "Python: What happens if you use recursion without a base case?", correctAnswers: ["maximum recursion depth exceeded","stack overflow","infinite recursion error"] },
        { q: "PHP: Predict the output: $a = '0'; if($a == false) echo 'Equal'; else echo 'Not Equal';", correctAnswers: ["Equal","outputs Equal","type coercion"] },
        { q: "PHP: Why does using include vs require change error handling in PHP scripts?", correctAnswers: ["require stops script on error","include continues script on error","different error handling"] },
        { q: "PHP: What happens if you try to send headers after echoing HTML output?", correctAnswers: ["headers already sent","cannot modify headers after output","header() error"] },
        { q: "Java: Predict the output: String s1 = new String('hello'); String s2 = 'hello'; System.out.println(s1==s2);", correctAnswers: ["false","s1 and s2 are not same object","outputs false"] },
        { q: "Java: Why does Java throw NullPointerException when calling a method on a null object reference?", correctAnswers: ["null object","cannot call method on null","NullPointerException"] },
        { q: "Java: What happens if you declare a local variable but don’t initialize it before use?", correctAnswers: ["compile error","variable might not have been initialized","uninitialized variable error"] },
        { q: "Java: Explain why HashMap allows one null key but Hashtable does not.", correctAnswers: ["HashMap allows null key","Hashtable does not allow null key","difference in implementation"] }
    ]
    };
    
// --- SIMPLE AI EVALUATION ---
function simpleAIEvaluate(userAnswer, correctAnswers) {
    const clean = str => str.toLowerCase().replace(/[^\w\s]/gi, '').split(' ');
    const userWords = clean(userAnswer);
    let bestScore = 0;

    correctAnswers.forEach(ans => {
        const correctWords = clean(ans);
        const matchCount = userWords.filter(w => correctWords.includes(w)).length;
        const score = (matchCount / correctWords.length) * 100;
        if (score > bestScore) bestScore = score;
    });

    if (bestScore > 80) return "right";
    else if (bestScore > 50) return "slightly-right";
    else if (bestScore > 20) return "slightly-wrong";
    else return "wrong";
}

// --- SHOW SCREEN ---
function show(screen) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// --- DIFFICULTY BUTTONS ---
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
        mode = btn.dataset.mode;
        loadLevels();
        show(screens.levels);
    };
});

// --- LOAD LEVEL BUTTONS WITH UNLOCK CHECK ---
async function loadLevels() {
    levelGrid.innerHTML = "";

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) return;

    try {
        // Get unlocked levels from backend
        const response = await fetch(`/userLevels/${loggedInUser.email}/${mode}`);
        const data = await response.json();
        const unlockedLevels = data.success ? data.levels : [];

        // Render buttons
        questions[mode].forEach((_, i) => {
            const levelNum = i + 1;

            const b = document.createElement('button');
            b.textContent = levelNum;

            const unlocked = unlockedLevels.includes(levelNum);
            if (!unlocked) {
                b.disabled = true;
                b.style.opacity = 0.5;
                b.style.cursor = 'not-allowed';
            } else {
                b.style.cursor = 'pointer';
            }

            b.onclick = () => {
                if (unlocked) loadQuestion(i);
            };

            levelGrid.appendChild(b);
        });

        // Check if next difficulty should unlock
        if (mode === "easy") {
            await fetch("/checkUnlockNextDifficulty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loggedInUser.email,
                    currentMode: "easy",
                    nextMode: "medium",
                    totalLevels: 20
                })
            });
        }
        if (mode === "medium") {
            await fetch("/checkUnlockNextDifficulty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loggedInUser.email,
                    currentMode: "medium",
                    nextMode: "hard",
                    totalLevels: 20
                })
            });
        }

    } catch (err) {
        console.error("Failed to load levels:", err);
    }
}

// --- LOAD QUESTION ---
async function loadQuestion(i) {
    const q = questions[mode][i];
    questionText.textContent = q.q;
    choicesBox.innerHTML = "";

    const prevNav = document.querySelector('.question .card .nav-buttons');
    if (prevNav) prevNav.remove();

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const isLastQuestion = i === questions[mode].length - 1;

    function capitalize(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async function saveAnswer(answer, correct) {
        if (!loggedInUser) return;

        try {
            await fetch("/saveAnswer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loggedInUser.email,
                    mode: mode,
                    level: i + 1,
                    answer: answer,
                    correct: correct
                })
            });

            await fetch("/saveQuizHistory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loggedInUser.email,
                    mode: capitalize(mode),
                    level: i + 1,
                    score: correct ? "Correct" : "Incorrect",
                    date: new Date().toLocaleString()
                })
            });

            if (!isLastQuestion) {
                const nextLevel = i + 2;
                await fetch("/unlockLevel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: loggedInUser.email,
                        mode: mode,
                        level: nextLevel
                    })
                });
            }

        } catch (error) {
            console.error("Failed to save quiz data:", error);
        }
    }

    // --- MULTIPLE CHOICE ---
    if (mode === "easy") {
        q.c.forEach((choice, idx) => {
            const b = document.createElement('button');
            b.textContent = capitalize(choice);

            b.onclick = () => {
                choicesBox.querySelectorAll('button').forEach(btn => btn.disabled = true);
                const isCorrect = idx === q.a;
                b.style.background = isCorrect ? "#4caf50" : "#f44336";
                saveAnswer(choice, isCorrect);

                if (!isLastQuestion) {
                    setTimeout(() => loadQuestion(i + 1), 500);
                } else {
                    showScoreWindow(mode);
                }
            };

            choicesBox.appendChild(b);
        });

    } else { // --- OPEN-ENDED ---
        const textarea = document.createElement('textarea');
        textarea.rows = 5;
        textarea.placeholder = "Type your answer here...";
        choicesBox.appendChild(textarea);

        textarea.addEventListener("input", () => {
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        });

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit';
        submitBtn.style.marginTop = '10px';

        submitBtn.onclick = () => {
            const userAnswer = textarea.value.trim();
            const result = simpleAIEvaluate(userAnswer, q.correctAnswers);
            const isCorrect = result === "right" || result === "slightly-right";

            textarea.style.background = isCorrect ? "#4caf50" : "#f44336";
            textarea.disabled = true;
            submitBtn.disabled = true;

            saveAnswer(userAnswer, isCorrect);

            if (!isLastQuestion) {
                setTimeout(() => loadQuestion(i + 1), 500);
            } else {
                showScoreWindow(mode);
            }
        };

        choicesBox.appendChild(submitBtn);
    }

    show(screens.question);
}

// --- SHOW SCORE WINDOW AFTER 20 LEVELS ---
async function showScoreWindow(mode) {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) return;

    try {
        const res = await fetch(`/quizHistory/${loggedInUser.email}`);
        const data = await res.json();
        if (!data.success) return;

        const history = data.history.filter(h => h.mode.toLowerCase() === mode);
        const correctCount = history.filter(h => h.score === "Correct").length;

        const scoreModal = document.getElementById("scoreModal");
        const scoreText = document.getElementById("scoreText");
        const scoreNumber = document.getElementById("scoreNumber");
        if (correctCount >= 10) {
            scoreText.textContent = "Congratulations";
        } else { scoreText.textContent = "You did Great"; }
        scoreNumber.textContent = correctCount;
        scoreModal.style.display = "flex";

        document.getElementById("scoreHomeBtn").onclick = () => {
            scoreModal.style.display = "none";
            show(screens.levels);
        };

        document.getElementById("scoreRetryBtn").onclick = () => {
            scoreModal.style.display = "none";
            loadLevels();
            loadQuestion(0);
        };

    } catch (err) {
        console.error("Error fetching history:", err);
    }
}

// --- RENDER QUIZ HISTORY ---
function renderQuizHistory(history) {
    const tbody = document.querySelector("#quizzes tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    history.forEach(item => {
        const row = document.createElement("tr");
        [item.mode, item.level, item.score, item.date].forEach(text => {
            const td = document.createElement("td");
            td.textContent = text.toString();
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
}

// --- LOAD QUIZ HISTORY ---
async function loadQuizHistory() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) return;

    try {
        const res = await fetch(`/quizHistory/${loggedInUser.email}`);
        const data = await res.json();
        if (!data.success) return;
        renderQuizHistory(data.history);
    } catch (error) {
        console.error("Failed to load quiz history:", error);
    }
}

// Load history on page load
document.addEventListener("DOMContentLoaded", () => {
    loadQuizHistory();
});

// --- LOCKED DIFFICULTY CHECK ---
async function checkDifficulty(email) {
    for (const btn of diffButtons) {
        const mode = btn.dataset.mode;
        try {
            const res = await fetch(`/userLevels/${email}/${mode}`);
            const data = await res.json();
            if (data.success) {
                if (!data.levels || data.levels.length === 0) {
                    btn.disabled = true;
                    btn.classList.add('locked');
                } else {
                    btn.disabled = false;
                    btn.classList.remove('locked');
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }
}

// Initialize difficulty buttons check
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (loggedInUser && loggedInUser.email) checkDifficulty(loggedInUser.email);
});

// --- INITIAL SCREEN ---
show(screens.difficulty);

document.getElementById('backLevel').onclick = () => {
    show(screens.difficulty);
};

document.getElementById('homeDifficulty').onclick = () => { window.location.href='Dashboard.html'; };
