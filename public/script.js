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

    fetch(`${API}/login`, {
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

    fetch(`${API}/register`, {
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

        const res = await fetch(`${API}/profile/${loggedInUser.email}`);
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

        const res = await fetch("/updateProfilePicture",{

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

        const res = await fetch(`${API}/user/${loggedInUser.email}`);
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

            const res = await fetch("${API}/updateUser", {
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
        { q: "1. Which HTML tag is used to define a numbered list?", c: ["<ul>", "<ol>", "<li>", "<dl>"], a: 1 },
        { q: "2. Which language is used to build the basic structure of a website?", c: ["CSS", "JavaScript", "HTML", "Python"], a: 2 },
        { q: "3. Which tag is used to create a hyperlink?", c: ["<link>", "<a>", "<href>", "<url>"], a: 1 },
        { q: "4. Where is the correct place to insert a <title> tag in an HTML document?", c: ["Inside the <body> section", "Inside the <head> section", "After the </html> tag", "Inside the <footer> section"], a: 1 },
        { q: "5. Which of the following is commonly used by web developers to write code?", c: ["Code editor", "Calculator", "Photo editor", "Video player"], a: 0 },
        { q: "6. Which language is primarily responsible for the styling and layout of a webpage?", c: ["HTML", "PHP", "CSS", "Python"], a: 2 },
        { q: "7. Which property changes the background color of an element?", c: ["bg-color", "color", "background-color", "page-color"], a: 2 },
        { q: "8. Which CSS property controls the size of text?", c: ["font-size", "text-size", "size", "font-style"], a: 0 },
        { q: "9. Which CSS property controls the spacing between lines of text?", c: ["line-height", "letter-spacing", "text-indent", "word-spacing"], a: 0 },
        { q: "10. Which tag is used to link an external CSS file to an HTML document?", c: ["<css>", "<style>", "<link>", "<stylesheet>"], a: 2 },
        { q: "11. In the web development 'sandwich,' if HTML is the structure and CSS is the skin, what is JavaScript?", c: ["The plate", "The flavor", "The behavior/interactivity", "The oven"], a: 2 },
        { q: "12. Which language allows a website to react when a user clicks a button?", c: ["HTML", "JavaScript", "CSS", "XML"], a: 1 },
        { q: "13. Which keyword declares a variable in JavaScript?", c: ["var", "let", "const", "All of the above"], a: 3 },
        { q: "14. What does document.getElementById('demo') do?", c: ["Finds an element by its class", "Finds an element by its ID", "Creates a new element", "Deletes an element"], a: 1 },
        { q: "15. HTML, CSS, and JavaScript are mainly used for:", c: ["Making games", "Building websites", "Writing books", "Editing videos"], a: 1 },
        { q: "16. Which HTML tag is used to insert an image?", c: ["<img>", "<image>", "<src>", "<pic>"], a: 0 },
        { q: "17. What does the <title> tag do?", c: ["Adds an image", "Names the webpage tab", "Creates a paragraph", "Changes color"], a: 1 },
        { q: "18. How do you write a comment in HTML?", c: ["// comment", "<!-- comment -->", "/* comment */", "# comment"], a: 1 },
        { q: "19. Which of the following is an example of a web browser used to open websites?", c: ["Chrome", "Microsoft Word", "Excel", "Photoshop"], a: 0 },
        { q: "20. Which HTML attribute is used to define inline styles?", c: ["class", "styles", "font", "style"], a: 3 }
    ],

    medium: [
        { q: "Explain the difference between an ordered list <ol> and an unordered list <ul> in HTML.", correctAnswers: ["<ol> is numbered, <ul> is bulleted","ordered lists use numbers, unordered use bullets"] },
        { q: "How do HTML comments work, and why are they important in a webpage?", correctAnswers: ["<!-- comment --> is ignored by browser","used to explain code for developers"] },
        { q: "What is the purpose of the <img> tag, and what are the essential attributes needed to display an image properly?", correctAnswers: ["<img> displays an image","src and alt attributes are required"] },
        { q: "How does the <a> tag create hyperlinks, and what attributes can you use to control link behavior?", correctAnswers: ["<a href='url'> creates a link","target='_blank' opens in a new tab"] },
        { q: "Why is it important to use semantic HTML tags instead of just <div> and <span>?", correctAnswers: ["Gives meaning to content","Improves accessibility and SEO"] },
        { q: "How do CSS comments work, and why should developers use them?", correctAnswers: ["/* comment */ is ignored by browser","explains styles for easier maintenance"] },
        { q: "Explain how the line-height property affects text formatting and readability.", correctAnswers: ["Controls vertical spacing between lines","Improves readability"] },
        { q: "Describe the difference between padding, margin, and border in the CSS Box Model.", correctAnswers: ["Padding inside element, border surrounds element, margin outside space"] },
        { q: "How can you use the font-size property to make text responsive across different screen sizes?", correctAnswers: ["Use relative units like em or rem","Text scales with screen size"] },
        { q: "Explain the purpose of linking an external CSS file versus using inline styles in HTML.", correctAnswers: ["External CSS is reusable and easier to maintain","Inline CSS is harder to update across pages"] },
        { q: "How does the background-color property differ from the color property in CSS?", correctAnswers: ["background-color changes background","color changes text color"] },
        { q: "What are the advantages of using a separate CSS file for styling multiple HTML pages?", correctAnswers: ["Maintains consistency across pages","Updates one file to affect all pages"] },
        { q: "Explain the difference between absolute, relative, and fixed positioning in CSS.", correctAnswers: ["Absolute relative to parent, Relative from normal position, Fixed stays on screen while scrolling"] },
        { q: "How do CSS variables improve maintainability of styles in a large project?", correctAnswers: ["Variables allow reuse of values","Change in one place updates all references"] },
        { q: "Describe what 'cascading' means in CSS and how it affects which rules are applied.", correctAnswers: ["Rules apply by priority: inline > internal > external","More specific selectors override general ones"] },
        { q: "Explain the difference between var, let, and const in JavaScript, and when you should use each.", correctAnswers: ["var function-scoped, let block-scoped, const block-scoped and cannot change"] },
        { q: "What does the document.getElementById() method do, and how is it used in manipulating web pages?", correctAnswers: ["Finds element by ID","Used to change content, style, or attributes"] },
        { q: "Describe the purpose of the Array.push() method and give an example of when you might use it.", correctAnswers: ["Adds element to end of array","Example: fruits.push('apple')"] },
        { q: "How does JavaScript add interactivity to a webpage that HTML and CSS cannot provide?", correctAnswers: ["Responds to user actions","Dynamically changes content","Validates forms"] },
        { q: "Explain the difference between synchronous and asynchronous JavaScript code and why it matters for user experience.", correctAnswers: ["Synchronous blocks code, asynchronous runs in background","Asynchronous keeps page responsive"] }
    ],

    hard: [
        { q: "What is the purpose of the <meta> tag in the <head> section? Give one example.", correctAnswers: ["Provides metadata","Example: <meta charset='UTF-8'> sets page encoding"] },
        { q: "Explain the difference between inline, internal, and external HTML structures.", correctAnswers: ["Inline inside elements, internal in <style>/<script> in page, external in linked files"] },
        { q: "How does semantic HTML improve accessibility?", correctAnswers: ["Semantic tags give meaning to content","Helps screen readers and SEO"] },
        { q: "What problems arise from using outdated HTML tags?", correctAnswers: ["Older tags may not work in modern browsers","Reduces accessibility"] },
        { q: "Why is separating HTML, CSS, and JavaScript considered a good practice?", correctAnswers: ["Keeps structure, design, and behavior separate","Easier maintenance"] },
        { q: "Explain the difference between relative, absolute, and fixed positioning in CSS.", correctAnswers: ["Relative moves from normal position, absolute relative to parent, fixed stays on screen"] },
        { q: "Why is the concept of 'cascading' important in CSS?", correctAnswers: ["Determines which style rule applies when multiple target the same element"] },
        { q: "How do CSS variables improve maintainability?", correctAnswers: ["Variables store reusable values like colors and fonts","Change one variable to update all references"] },
        { q: "What are the drawbacks of inline CSS compared to external stylesheets?", correctAnswers: ["Harder to maintain","Cannot reuse across pages"] },
        { q: "How does responsive design affect user experience?", correctAnswers: ["Makes websites readable and usable on all devices"] },
        { q: "How can developers control which CSS rule applies when multiple rules target the same element?", correctAnswers: ["Use specificity, !important, and proper selector hierarchy"] },
        { q: "Explain the difference between fixed-width and fluid layouts.", correctAnswers: ["Fixed stays same size on all screens, fluid adjusts proportionally to screen"] },
        { q: "How do pseudo-classes like :hover improve interactivity?", correctAnswers: ["Change styles on user interaction, e.g., highlight buttons"] },
        { q: "How do media queries help make websites responsive?", correctAnswers: ["Apply different styles based on screen size or device"] },
        { q: "What is the difference between relative and absolute units in CSS?", correctAnswers: ["Relative units (em, %, rem) scale, absolute units (px) are fixed"] },
        { q: "Explain the difference between synchronous and asynchronous functions in JavaScript.", correctAnswers: ["Synchronous blocks, asynchronous runs in background"] },
        { q: "Why is const preferred over var in modern JavaScript?", correctAnswers: ["Prevents accidental reassignment","Block-scoped, reduces bugs"] },
        { q: "Describe the concept of 'Hoisting' in JavaScript.", correctAnswers: ["Variables/functions moved to top of scope","var initialized undefined, let/const cannot be used before declaration"] },
        { q: "What does modular JavaScript mean, and why is it important?", correctAnswers: ["Split code into separate files/functions","Easier maintenance and reuse"] },
        { q: "How does JavaScript improve user experience on websites?", correctAnswers: ["Dynamic content, interactivity, animations, faster response"] }
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
