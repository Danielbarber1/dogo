import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/clients';
import { AuthedRequest } from '../middleware/auth';

const schema = z.object({
  dogId: z.string().uuid(),
  amount: z.number().positive().max(100000),
  category: z.enum(['FOOD', 'TREATS', 'VET', 'TOYS', 'GROOMING', 'TRAINING']),
  date: z.coerce.date().default(() => new Date()),
  notes: z.string().max(300).optional(),
});

export const expenses = Router();

expenses.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const dog = await prisma.dog.findFirst({ where: { id: d.dogId, userId: (req as AuthedRequest).userId } });
  if (!dog) return res.status(404).json({ error: 'Dog not found' });

  const expense = await prisma.expense.create({ data: d });
  const start = new Date(d.date.getFullYear(), d.date.getMonth(), 1);
  const end = new Date(d.date.getFullYear(), d.date.getMonth() + 1, 1);
  const where = { dogId: d.dogId, date: { gte: start, lt: end } };
  const [total, byCategory] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true } }),
  ]);
  const monthlyTotal = Number(total._sum.amount ?? 0);
  const budget = dog.monthlyBudget ? Number(dog.monthlyBudget) : null;
  const usage = budget ? monthlyTotal / budget : null;
  res.status(201).json({
    expense, monthlyTotal,
    byCategory: byCategory.map((c) => ({ category: c.category, total: Number(c._sum.amount) })),
    budget, usage,
    warning: usage === null ? null : usage >= 1 ? 'OVER' : usage >= 0.8 ? 'NEAR' : null,
  });
});
