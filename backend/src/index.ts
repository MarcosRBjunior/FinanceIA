import 'dotenv/config';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { classificationsRoutes } from './api/routes/classifications.js';
import { metricsRoutes } from './api/routes/metrics.js';
import { transactionsRoutes } from './api/routes/transactions.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok' }));

await app.register(transactionsRoutes);
await app.register(classificationsRoutes);
await app.register(metricsRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
