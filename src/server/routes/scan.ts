import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { scanUrl } from '../../core/scan.js';

const bodySchema = z.object({ url: z.string().url(), autoconsentAction: z.enum(['optIn', 'optOut']).optional() });

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/scan', async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      if (parsed.data.autoconsentAction) {
        process.env.AUTOCONSENT_ACTION = parsed.data.autoconsentAction;
      }
      const result = await scanUrl(parsed.data.url);
      return res.status(200).send(result);
    } catch (e: any) {
      return res.status(500).send({ error: 'Internal error', message: e?.message || String(e) });
    }
  });
};

export default plugin;


