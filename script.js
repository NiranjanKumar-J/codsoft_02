const API_URL = ''; 

let currentUser = localStorage.getItem('currentUser') || null;
let quizzes = []; 
let isLoginMode = true;

let currentActiveQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval;
let timeLeft = 15;
const TIME_PER_QUESTION = 15;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) showDashboard();
    else showSection('auth-section');
});

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const sub = document.getElementById('auth-sub');
    const btn = document.getElementById('auth-btn');
    const msg = document.getElementById('toggle-msg');
    const link = document.getElementById('toggle-link');

    if (isLoginMode) {
        title.innerHTML = '<i class="fas fa-lock"></i> Login'; sub.innerText = "Welcome back, Legend!"; btn.innerText = "Login"; msg.innerText = "New here?"; link.innerText = "Create Account";
    } else {
        title.innerHTML = '<i class="fas fa-user-plus"></i> Register'; sub.innerText = "Join the Future"; btn.innerText = "Register"; msg.innerText = "Already member?"; link.innerText = "Login Here";
    }
}

async function handleAuth() {
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!name || !pass) return showToast("Enter Username & Password!", "error");

    const endpoint = isLoginMode ? '/login' : '/register';
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, pass })
        });
        
        const result = await response.json();

        if (result.success) {
            if (isLoginMode) {
                currentUser = name; 
                localStorage.setItem('currentUser', currentUser); 
                showToast(`Welcome back, ${name}! 🚀`); 
                showDashboard(); 
            } else {
                showToast("Registered! Please Login.", "success"); 
                toggleAuthMode(); 
            }
        } else {
            showToast(result.message || "Authentication Failed", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Server Error. Check Internet.", "error");
    }
}

function logout() {
    currentUser = null; localStorage.removeItem('currentUser'); clearInterval(timerInterval);
    document.getElementById('username').value = ''; document.getElementById('password').value = ''; 
    showToast("Logged out successfully!", "success");
    showSection('auth-section');
}

function showDashboard() {
    document.getElementById('user-display').innerText = currentUser;
    renderQuizList();
    showSection('dashboard-section');
}

async function renderQuizList() {
    const list = document.getElementById('quiz-list'); 
    list.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Loading Quizzes...</p>';
    
    try {
        const response = await fetch(`${API_URL}/quizzes`);
        quizzes = await response.json(); 
        
        list.innerHTML = '';
        if (quizzes.length === 0) { list.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No quizzes yet.</p>'; return; }
        
        quizzes.forEach((quiz) => {
            const quizId = quiz._id || quiz.id; 
            
            const div = document.createElement('div'); div.className = 'quiz-card';
            div.innerHTML = `
                <div class="quiz-info" onclick="startQuiz('${quizId}')">
                    <strong style="color:var(--primary-glow)">${quiz.title}</strong><br>
                    <small style="color:var(--text-muted)">by ${quiz.creator}</small>
                </div>
                <button class="btn-delete" onclick="deleteQuiz('${quizId}', event)">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p style="text-align:center; color:var(--danger)">Failed to load quizzes.</p>';
        console.error("Load Error:", error);
    }
}

async function deleteQuiz(id, event) {
    event.stopPropagation();
    if(confirm("Are you sure you want to delete this Quiz?")) {
        try {
            const response = await fetch(`${API_URL}/quiz/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if(result.success) {
                showToast("🗑️ Quiz Deleted!", "error");
                renderQuizList(); 
            } else {
                showToast("Failed to delete", "error");
            }
        } catch (error) {
            showToast("Server Error", "error");
        }
    }
}


function showCreateQuiz() {
    document.getElementById('new-quiz-title').value = '';
    document.getElementById('questions-container').innerHTML = '';
    addQuestionInput(); showSection('create-quiz-section');
}

function addQuestionInput() {
    const container = document.getElementById('questions-container');
    const index = container.children.length + 1;
    const div = document.createElement('div'); div.className = 'question-block';
    div.style.background="rgba(255,255,255,0.03)"; div.style.padding="15px"; div.style.marginBottom="15px"; div.style.borderRadius="12px";
    div.innerHTML = `
        <h4 style="margin-top:0; color:var(--text-main)">Question ${index}</h4>
        <input type="text" class="q-text" placeholder="Type Question..." required>
        <input type="text" class="q-opt1" placeholder="Option 1" required>
        <input type="text" class="q-opt2" placeholder="Option 2" required>
        <input type="text" class="q-opt3" placeholder="Option 3" required>
        <input type="text" class="q-opt4" placeholder="Option 4" required>
        <select class="q-ans"><option value="1">Option 1 Correct</option><option value="2">Option 2 Correct</option><option value="3">Option 3 Correct</option><option value="4">Option 4 Correct</option></select>
    `;
    container.appendChild(div);
}

async function saveQuiz() {
    const title = document.getElementById('new-quiz-title').value.trim();
    if (!title) return showToast("⚠️ Enter Quiz Title!", "error");
    const qBlocks = document.querySelectorAll('.question-block');
    const newQuestions = [];
    let isError = false;

    qBlocks.forEach((block, i) => {
        if(isError) return;
        const text = block.querySelector('.q-text')?.value.trim();
        const o1 = block.querySelector('.q-opt1')?.value.trim();
        const o2 = block.querySelector('.q-opt2')?.value.trim();
        const o3 = block.querySelector('.q-opt3')?.value.trim();
        const o4 = block.querySelector('.q-opt4')?.value.trim();
        const ans = block.querySelector('.q-ans')?.value;

        if(!text || !o1 || !o2) { showToast(`⚠️ Question ${i+1} incomplete!`, "error"); isError=true; return; }
        newQuestions.push({ text, options: [o1, o2, o3, o4], correct: parseInt(ans) });
    });

    if(isError) return;
    if(newQuestions.length === 0) return showToast("⚠️ Add at least one question!", "error");

    const quizData = { title, creator: currentUser, questions: newQuestions };

    try {
        const response = await fetch(`${API_URL}/save-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData)
        });
        const result = await response.json();
        
        if(result.success) {
            showToast("🎉 Quiz Published!", "success"); 
            showDashboard();
        } else {
            showToast("Failed to save quiz", "error");
        }
    } catch(err) {
        showToast("Server Error", "error");
    }
}

function startQuiz(quizId) {
    const quiz = quizzes.find(q => q._id === quizId || q.id === quizId);
    if(!quiz) return showToast("Error loading quiz", "error");

    currentActiveQuiz = quiz;
    currentQuestionIndex = 0;
    userAnswers = new Array(quiz.questions.length).fill(null);
    document.getElementById('solving-title').innerText = quiz.title;
    loadQuestion();
    showSection('take-quiz-section');
}

function loadQuestion() {
    clearInterval(timerInterval); startTimer(); 
    const q = currentActiveQuiz.questions[currentQuestionIndex];
    const container = document.getElementById('single-question-container');
    const savedAns = userAnswers[currentQuestionIndex];

    container.innerHTML = `
        <div style="margin-bottom:20px;">
            <p style="font-size:1.3rem; margin-bottom:20px;">
                <span style="color:var(--primary-glow); font-weight:bold;">Q${currentQuestionIndex + 1}:</span> ${q.text}
            </p>
            ${q.options.map((opt, i) => `
                <div class="option-box" onclick="selectOption(${i})">
                    <input type="radio" name="currentQ" value="${i+1}" ${savedAns === (i+1) ? 'checked' : ''}> 
                    <span>${opt}</span>
                </div>
            `).join('')}
        </div>
        <p style="text-align:right; font-size:12px; color:var(--text-muted);">Question ${currentQuestionIndex + 1} of ${currentActiveQuiz.questions.length}</p>
    `;

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (currentQuestionIndex === 0) prevBtn.classList.add('hidden'); else prevBtn.classList.remove('hidden');
    if (currentQuestionIndex === currentActiveQuiz.questions.length - 1) { nextBtn.classList.add('hidden'); submitBtn.classList.remove('hidden'); }
    else { nextBtn.classList.remove('hidden'); submitBtn.classList.add('hidden'); }
}

function startTimer() {
    timeLeft = TIME_PER_QUESTION; updateTimerUI();
    timerInterval = setInterval(() => {
        timeLeft--; updateTimerUI();
        if (timeLeft <= 0) { clearInterval(timerInterval); handleTimeUp(); }
    }, 1000);
}

function updateTimerUI() {
    document.getElementById('time-display').innerText = timeLeft;
    const percentage = (timeLeft / TIME_PER_QUESTION) * 100;
    const bar = document.getElementById('timer-bar');
    bar.style.width = `${percentage}%`;
    bar.style.background = timeLeft <= 5 ? "var(--danger)" : "linear-gradient(90deg, var(--primary-glow), var(--secondary-glow))";
}

function handleTimeUp() {
    showToast("⏰ Time's Up!", "error");
    if (currentQuestionIndex < currentActiveQuiz.questions.length - 1) { currentQuestionIndex++; loadQuestion(); }
    else { submitQuiz(); }
}

function selectOption(optIndex) {
    const radios = document.getElementsByName('currentQ');
    if(radios[optIndex]) radios[optIndex].checked = true;
    userAnswers[currentQuestionIndex] = optIndex + 1;
}

function nextQuestion() {
    if (!userAnswers[currentQuestionIndex]) return showToast("⚠️ Select an answer!", "error");
    currentQuestionIndex++; loadQuestion();
}
function prevQuestion() { currentQuestionIndex--; loadQuestion(); }

function submitQuiz() {
    clearInterval(timerInterval);
    if (userAnswers[currentQuestionIndex] === null && timeLeft > 0) return showToast("⚠️ Select an answer!", "error");
    
    let score = 0; let reviewHTML = "";
    currentActiveQuiz.questions.forEach((q, idx) => {
        const userPick = userAnswers[idx];
        const isCorrect = userPick === q.correct;
        if (isCorrect) score++;
        let status = userPick ? (isCorrect ? '✅' : '❌') : '⏳ Skipped';
        let ansText = userPick ? q.options[userPick-1] : '<span style="color:orange">Timed Out</span>';
        
        reviewHTML += `
            <div class="review-item ${isCorrect ? 'review-correct' : 'review-wrong'}">
                <p><strong>Q${idx+1}:</strong> ${q.text}</p>
                <p>Answer: ${ansText} ${status}</p>
                ${!isCorrect ? `<p style="color:var(--text-muted)">Correct: <strong>${q.options[q.correct-1]}</strong></p>` : ''}
            </div>
        `;
    });

    const feedbackText = document.getElementById('feedback-text');
    
    if (score === currentActiveQuiz.questions.length) {
        feedbackText.innerText = "🌟 Legendary! Vera Level!";
        var duration = 3 * 1000;
        var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#00f2ff', '#a200ff', '#ffffff'] });
            confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#00f2ff', '#a200ff', '#ffffff'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    } else if (score >= currentActiveQuiz.questions.length / 2) {
        feedbackText.innerText = "👍 Good Job! Passed!";
        confetti({ particleCount: 300, spread: 100, origin: { y: 0.6 } });
    } else {
        feedbackText.innerText = "😐 Needs Improvement!";
    }

    document.getElementById('score-text').innerText = `${score} / ${currentActiveQuiz.questions.length}`;
    document.getElementById('review-container').innerHTML = reviewHTML;
    document.getElementById('review-container').classList.add('hidden');
    showToast("🏆 Quiz Completed!", "success");
    showSection('result-section');
}

function toggleReview() { document.getElementById('review-container').classList.toggle('hidden'); }

function showSection(id) {
    document.querySelectorAll('.container').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}