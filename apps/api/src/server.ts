import Fastify from 'fastify';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.LOG_LEVEL } });
app.get('/health', async () => ({ status: 'ok', service: 'slotsure-api' }));
const start = async (): Promise<void> => {
  try { await app.listen({ port: config.PORT, host: config.HOST }); }
  catch (error) { app.log.error(error, 'Unable to start SlotSure API'); process.exit(1); }
};
void start();
