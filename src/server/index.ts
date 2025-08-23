import Fastify from 'fastify';
import scanRoute from './routes/scan.js';

const server = Fastify({ logger: false });

server.register(scanRoute, { prefix: '/' });

const PORT = Number(process.env.PORT || 3000);

server.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  // eslint-disable-next-line no-console
  console.log(`auditor-service listening on ${PORT}`);
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});


