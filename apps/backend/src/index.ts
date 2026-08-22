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
  res.json({
    status: 'ok',
    service: 'agentic-codelab-backend',
    timestamp: new Date().toISOString(),
  });
});

app.listen(env.PORT, () => {
  console.log(`[Server] Agentic CodeLab backend running on port ${env.PORT}`);

  // Self-calling keep-alive service (runs every 14 minutes to prevent Render free-tier spin-down)
  const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
  const pingTargetUrl = env.RENDER_EXTERNAL_URL.replace(/\/$/, '');

  const keepAlivePing = async () => {
    try {
      const res = await fetch(`${pingTargetUrl}/health`);
      console.log(`[KeepAlive] Self-pinged ${pingTargetUrl}/health - Status: ${res.status}`);
    } catch (err: any) {
      console.warn(`[KeepAlive] Self-ping attempt to ${pingTargetUrl}/health failed:`, err.message);
    }
  };

  // Initial ping after 30 seconds
  setTimeout(keepAlivePing, 30000);

  // Recurring ping every 14 minutes
  setInterval(keepAlivePing, PING_INTERVAL_MS);
});
