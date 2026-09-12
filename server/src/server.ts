import { createApp } from './app';
import { env } from './config/env';
import { startBackgroundWorkers } from './workers';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`⚡ ecoVolt-finder server running on http://0.0.0.0:${env.PORT}`);
  console.log(`📖 Interactive API docs available at http://localhost:${env.PORT}/docs`);
  console.log(`🩺 Health check at http://localhost:${env.PORT}/health`);

  // Start dynamic background workers (reminder monitor & multi-user prediction worker pool)
  startBackgroundWorkers();
});

const handleShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
