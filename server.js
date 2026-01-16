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

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizapp';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.log("❌ DB Error:", err));

const UserSchema = new mongoose.Schema({
    name: String,
    pass: String
});
const User = mongoose.model('User', UserSchema);

const QuizSchema = new mongoose.Schema({
    title: String,
    creator: String,
    questions: Array
});
const Quiz = mongoose.model('Quiz', QuizSchema);

app.post('/login', async (req, res) => {
    try {
        const { name, pass } = req.body;
        const user = await User.findOne({ name, pass });
        if(user) res.json({ success: true, message: "Login Success" });
        else res.json({ success: false, message: "Invalid Credentials" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/register', async (req, res) => {
    try {
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
        const quiz = new Quiz(req.body);
        await quiz.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/quiz/:id', async (req, res) => {
    try {
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;