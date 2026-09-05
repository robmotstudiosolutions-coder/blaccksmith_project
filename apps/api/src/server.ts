import { loadConfig } from './config.js';
import { BookingService } from './booking-service.js';
import { DevelopmentAuthProvider } from './auth.js';
import { buildApp } from './app.js';

const config = loadConfig();
const bookingService = new BookingService(config.DATABASE_URL, config.HOLD_DURATION_SECONDS);
const authProvider = new DevelopmentAuthProvider();

const app = buildApp(config, bookingService, authProvider);
app.addHook('onClose', async () => bookingService.close());

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (error) {
    app.log.error(error, 'Unable to start SlotSure API');
    process.exit(1);
  }
};

void start();
