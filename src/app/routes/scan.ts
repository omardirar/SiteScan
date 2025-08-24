import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { runScan } from '../../analysis/scan.js';

const bodySchema = z.object({
  url: z.string().url(),
  autoconsentAction: z.enum(['optIn', 'optOut']).optional(),
});

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/scan', async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const payload = await runScan(
        parsed.data.url,
        parsed.data.autoconsentAction ?? null,
      );
      return res.status(200).send(payload);
    } catch (e: any) {
      // Basic error logging
      console.error(
        `[scan] failed for body: ${JSON.stringify(req.body)} -> ${e?.message || String(e)}`,
      );
      return res.status(500).send({ error: 'Scan failed to complete' });
    }
  });
};

export default plugin;
