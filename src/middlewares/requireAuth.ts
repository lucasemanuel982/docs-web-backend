import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('requireAuth - Headers:', req.headers.authorization ? 'Token presente' : 'Token ausente');
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('requireAuth - Token não fornecido ou formato inválido');
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  console.log('requireAuth - Token extraído:', token ? 'Presente' : 'Ausente');
  
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    console.log('requireAuth - Token válido para usuário:', payload.userId);
    req.user = payload;
    next();
  } catch (err) {
    console.error('requireAuth - Erro ao verificar token:', err);
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
}
