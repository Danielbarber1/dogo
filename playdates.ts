import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/clients';
import { AuthedRequest } from '../middleware/auth';

const schema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(500).optional(),
  locationName: z.string().min(2),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  scheduledAt: z.coerce.date().refine((d) => d > new Date(), 'Must be in the future'),
  isPrivate: z.boolean().default(false),
});

export const playdates = Router();

playdates.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const creatorId = (req as AuthedRequest).userId;
  const playdate = await prisma.playdate.create({
    data: { ...parsed.data, creatorId, rsvps: { create: { userId: creatorId } } },
    include: { rsvps: true },
  });
  res.status(201).json(playdate);
});

playdates.post('/:id/rsvp', async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const status = z.enum(['GOING', 'MAYBE', 'DECLINED']).parse(req.body.status);
  const rsvp = await prisma.rsvp.upsert({
    where: { playdateId_userId: { playdateId: req.params.id, userId } },
    create: { playdateId: req.params.id, userId, status },
    update: { status },
  });
  res.json(rsvp);
});

playdates.get('/upcoming', async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  res.json(await prisma.playdate.findMany({
    where: { scheduledAt: { gte: new Date() }, OR: [{ isPrivate: false }, { creatorId: userId }, { rsvps: { some: { userId } } }] },
    orderBy: { scheduledAt: 'asc' }, take: 20,
  }));
});
