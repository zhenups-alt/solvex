import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import statusRouter from './routes/status.routes.js';
import walletRouter from './routes/wallet.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'solvex-api',
    message: 'Backend is running. Use /api/status or /api/wallets endpoints.',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api', statusRouter);
app.use('/api', walletRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
