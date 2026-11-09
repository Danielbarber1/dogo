import { NextFunction, Request, Response } from 'express';
import { supabase } from '../lib/clients';

export interface AuthedRequest extends Request { userId: string }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });
  (req as AuthedRequest).userId = data.user.id;
  next();
}
