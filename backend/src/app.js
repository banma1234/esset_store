const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { mongoHealth } = require('./config/mongo');

const commonCodeRoutes = require('./routes/commonCode.routes');
const storageRoutes = require('./routes/storage.routes');
const dbRoutes = require('./routes/db.routes');
const logRoutes = require('./routes/logs.routes');

const { logger } = require('./utils/logers');
const { requestLogger } = require('./middlewares/requestLogger');
const { requestContext } = require('./middlewares/requestContext');
const { errorHandler } = require('./middlewares/errorHandler');

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

app.use('/api/v1/db', dbRoutes);
app.use(commonCodeRoutes);
app.use(storageRoutes);
app.use(logRoutes);
app.use(requestContext());
app.use(requestLogger());
app.use(errorHandler);

// 서버 기동 시 로그 예시
process.nextTick(() => {
  /** @type {string} */
  const nodeEnv = process.env.NODE_ENV || 'development';
  logger.info(`서버 시작 - NODE_ENV=${nodeEnv}`, { scope: 'bootstrap' });
});
// app.use(errorHandler); // 마지막에

module.exports = app;
