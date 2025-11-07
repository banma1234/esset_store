const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { mongoHealth } = require('./config/mongo');

const commonCodeRoutes = require('./routes/commonCode.routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  const db = mongoHealth();
  res.json({ ok: db.status === 'up', db });
});

// GET /api/v1/test -> { message: "test successful" }
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'test successful' });
});

// db ping
const dbRoutes = require('./routes/db.routes');
app.use('/api/v1/db', dbRoutes);
app.use(commonCodeRoutes);

// app.use(errorHandler); // 마지막에

module.exports = app;
