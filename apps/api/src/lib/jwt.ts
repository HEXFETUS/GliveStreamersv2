import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signToken(payload: { sub: string; email?: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}