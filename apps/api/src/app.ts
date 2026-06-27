import express, { type Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import streamRoutes from './routes/streams.js';
import categoryRoutes from './routes/categories.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/categories', categoryRoutes);

export default app;
