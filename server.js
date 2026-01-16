// server.js
require('dotenv').config(); // 1. Ithu mukkiyam: .env file read panna
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000; // .env la irunthu edukum

// --- Database Connection (Using MONGO_URI) ---
mongoose.connect(process.env.MONGO_URI) // 2. Ippo link direct ah illa, variable la iruku
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// ... Meethi code same than ...

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;