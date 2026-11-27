import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Передайте токен в заголовке Authorization: Bearer <token>' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'На сервере не настроен JWT_SECRET' });
    return;
  }

  try {
    const token = authorization.slice('Bearer '.length);
    const payload = jwt.verify(token, secret);

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      res.status(401).json({ error: 'Некорректный токен авторизации' });
      return;
    }

    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен или срок его действия истёк' });
  }
}
