
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';

import { config } from './config/env.js';
import routes from './routes/index.js';

import { connectDB } from './database/mongoose/db_connection.js';
import { connectPosDB } from './database/pos/db_connection.js';

import { handleWebSocketClient } from './websocket/client.js';

const app = express();

app.use(cors({
  origin: config.nodeEnv === 'production'
    ? (process.env.CLIENT_ORIGIN || '').split(',').filter(Boolean)
    : '*',
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true,
}));

app.use(routes);

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  maxPayload: 1024 * 1024,
});

wss.on('connection', handleWebSocketClient);

async function startServer() {
  try {
    if (config.nodeEnv === 'development') {
      await connectPosDB();
    } else {
      await connectDB();
    }

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  for (const client of wss.clients) {
    client.close(1001, 'Server shutting down');
  }

  wss.close();

  server.close(() => {
    process.exit(0);
  });

  // Prevent hanging forever if clients or connections remain open.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
