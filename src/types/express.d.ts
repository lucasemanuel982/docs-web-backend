import { Request } from 'express';
import { JWTPayload } from './index.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}
