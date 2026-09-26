const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const he = require('he');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = 'mongodb+srv://kp36:kp3645K@cluster0.gyccgyy.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB Connected'));

const Question = mongoose.model('Question', new mongoose.Schema({
    content: String, options: [String], correctOption: Number, difficulty: { type: Number, index: true }
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, currentAbility: { type: Number, default: 5.0 }, strikeCount: { type: Number, default: 0 },
    answeredQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
}));

// SEEDING
app.get('/seed-questions', async (req, res) => {
    const apiRes = await axios.get('https://opentdb.com/api.php?amount=50&category=18&type=multiple');
    const questions = apiRes.data.results.map(q => {
        const opts = [...q.incorrect_answers.map(a => he.decode(a))];
        const correctIdx = Math.floor(Math.random() * 4);
        opts.splice(correctIdx, 0, he.decode(q.correct_answer));
        return { content: he.decode(q.question), options: opts, correctOption: correctIdx, difficulty: q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9 };
    });
    await Question.deleteMany({});
    await Question.insertMany(questions);
    res.send("<h1>Database Seeded!</h1>");
});

// CASE-INSENSITIVE LOGIN
app.post('/api/login', async (req, res) => {
    const name = req.body.username.trim();
    let user = await User.findOne({ username: new RegExp(`^${name}$`, 'i') });
    if (!user) user = await new User({ username: name }).save();
    res.json(user);
});

// SMART QUESTION FETCH
app.get('/api/question/:userId', async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (user.strikeCount >= 3) return res.json({ message: 'GameOver' });

    const ai = await axios.post('http://127.0.0.1:5000/get-next-difficulty', { current_ability: user.currentAbility });
    const target = ai.data.target_difficulty;

    // Try to find a NEW question first
    let pool = await Question.aggregate([
        { $match: { difficulty: { $gte: target - 2, $lte: target + 2 }, _id: { $nin: user.answeredQuestionIds } } },
        { $sample: { size: 1 } }
    ]);

    // Fallback to ANY question if no new ones exist in range
    if (pool.length === 0) {
        pool = await Question.aggregate([
            { $match: { difficulty: { $gte: target - 2, $lte: target + 2 } } },
            { $sample: { size: 1 } }
        ]);
    }

    const q = pool[0];
    // Reliable ID Check for "Visited" tag
    const isVisited = user.answeredQuestionIds.some(id => id.toString() === q._id.toString());
    res.json({ ...q, isVisited });
});

app.post('/api/answer', async (req, res) => {
    const { userId, questionId, selectedOption, responseTime } = req.body;
    const user = await User.findById(userId);
    const q = await Question.findById(questionId);
    const isCorrect = q.correctOption === selectedOption;

    if (!isCorrect) user.strikeCount += 1;
    if (!user.answeredQuestionIds.some(id => id.toString() === questionId)) {
        user.answeredQuestionIds.push(questionId);
    }

    const ai = await axios.post('http://127.0.0.1:5000/update-ability', {
        current_ability: user.currentAbility, was_correct: isCorrect, response_time: responseTime
    });

    user.currentAbility = ai.data.new_ability;
    await user.save();
    res.json({ wasCorrect: isCorrect, correctOption: q.correctOption, newAbility: user.currentAbility, strikes: user.strikeCount });
});

app.post('/api/reset', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.body.userId, { currentAbility: 5.0, strikeCount: 0 }, { new: true });
    res.json(user);
});

app.listen(8081);