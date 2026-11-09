import cors from 'cors';
import express from 'express';
import { requireAuth } from './middleware/auth';
import { dogs } from './routes/dogs';
import { expenses } from './routes/expenses';
import { playdates } from './routes/playdates';
import { sos } from './routes/sos';

const app = express();
app.use(cors(), express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', requireAuth);
app.use('/api/playdates', playdates);
app.use('/api/dogs', dogs);
app.use('/api/expenses', expenses);
app.use('/api/sos', sos);
app.listen(process.env.PORT ?? 4000, () => console.log('PawPals API up'));
