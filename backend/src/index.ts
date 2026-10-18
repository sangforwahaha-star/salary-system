import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import salaryRoutes from './routes/salary.js';
import userRoutes from './routes/user.js';
import importRoutes from './routes/import.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2890;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:2890').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
