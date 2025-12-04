const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');
const { mongoHealth } = require('./config/mongo');

const commonCodeRoutes = require('./routes/commonCode.routes');
const presignedRoutes = require('./routes/presigned.routes');
const commitRoutes = require('./routes/commit.routes');
const logRoutes = require('./routes/logs.routes');
const assetsSearchRoutes = require('./routes/assets.routes');
const test2Routes = require('./routes/test2.routes');

const { logger } = require('./utils/logers');
const { requestLogger } = require('./middlewares/requestLogger');
const { requestContext } = require('./middlewares/requestContext');
const { errorHandler } = require('./middlewares/errorHandler');

require('./worker/asset.worker');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(morgan('combined'));

app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/health', (req, res) => {
  const db = mongoHealth();
  res.json({ ok: db.status === 'up', db });
});

// GET /api/v1/test -> { message: "test successful" }
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'test successful' });
});

// 1) openapi.yaml 읽기
// __dirname === backend/src 기준
// backend/src/openapi.yaml 을 읽으려면 '..' 없이 바로 openapi.yaml
const openapiPath = path.join(__dirname, 'openapi.yaml');

let openapiDocument = {};

try {
  const fileContents = fs.readFileSync(openapiPath, 'utf8');
  openapiDocument = yaml.load(fileContents);
  console.log('✅ swagger-ui: openapi.yaml loaded from', openapiPath);
} catch (err) {
  console.error('❌ openapi.yaml 로드 실패:', err.message, '경로:', openapiPath);
  openapiDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Temporary API Docs',
      version: '0.0.0',
      description: 'openapi.yaml 을 로드하는 데 실패했습니다.',
    },
  };
}

// 2) Swagger UI 미들웨어 연결
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use(requestContext());
app.use(requestLogger());
app.use(commonCodeRoutes);
app.use(presignedRoutes);
app.use(commitRoutes);
app.use(logRoutes);
app.use(assetsSearchRoutes);
app.use(errorHandler);

app.use(test2Routes);

// 서버 기동 시 로그 예시
process.nextTick(() => {
  /** @type {string} */
  const nodeEnv = process.env.NODE_ENV || 'development';
  logger.info(`서버 시작 - NODE_ENV=${nodeEnv}`, { scope: 'bootstrap' });
});
// app.use(errorHandler); // 마지막에

module.exports = app;
