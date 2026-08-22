import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './routes/api.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vocallab-backend', timestamp: new Date().toISOString() });
});

app.listen(env.PORT, () => {
  console.log(`[Server] vocallab backend server running on http://localhost:${env.PORT}`);
});
