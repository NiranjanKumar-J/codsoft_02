require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 1. OPTIMIZED DATABASE CONNECTION (முக்கியமான மாற்றம்) ---
// Vercel-ல் Connection துண்டிக்கப்படாமல் இருக்க இது உதவும்.

let isConnected = false; // Connection status track panna

const connectDB = async () => {
    if (isConnected) {
        console.log("Using existing database connection");
        return;
    }
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizapp';
        await mongoose.connect(mongoURI, {
            dbName: 'quizapp', // Database Name inga correct-a irukanum
            serverSelectionTimeoutMS: 5000 // 5 seconds kulla connect aagala na error adika
        });
        isConnected = true;
        console.log("✅ Database Connected New");
    } catch (err) {
        console.log("❌ DB Connection Error:", err);
        throw err; // Stop request if DB fails
    }
};

// --- 2. SCHEMAS ---
const UserSchema = new mongoose.Schema({ name: String, pass: String });
const User = mongoose.model('User', UserSchema);

const QuizSchema = new mongoose.Schema({ title: String, creator: String, questions: Array });
const Quiz = mongoose.model('Quiz', QuizSchema);

// --- 3. ROUTES (With DB Check) ---
// Ovvoru route-layum "await connectDB()" mukkiyam!

app.post('/login', async (req, res) => {
    try {
        await connectDB(); // Check connection first
        const { name, pass } = req.body;
        const user = await User.findOne({ name, pass });
        if(user) res.json({ success: true, message: "Login Success" });
        else res.json({ success: false, message: "Invalid Credentials" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/register', async (req, res) => {
    try {
        await connectDB();
        const { name, pass } = req.body;
        const existing = await User.findOne({ name });
        if(existing) return res.json({ success: false, message: "Username Taken" });

        const newUser = new User({ name, pass });
        await newUser.save();
        res.json({ success: true, message: "Registered Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/save-quiz', async (req, res) => {
    try {
        await connectDB(); // Important!
        const quiz = new Quiz(req.body);
        await quiz.save();
        res.json({ success: true });
    } catch (err) { 
        console.error("Save Error:", err); // Log error for debugging
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/quizzes', async (req, res) => {
    try {
        await connectDB();
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/quiz/:id', async (req, res) => {
    try {
        await connectDB();
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;