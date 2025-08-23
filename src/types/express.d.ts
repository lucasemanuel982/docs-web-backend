import { Request } from 'express';
import { JWTPayload } from './index';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}
