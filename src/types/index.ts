import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

export interface User {
  _id: string;
  email: string;
  name: string;
  password: string;
  profileImage?: string;
  createdAt: Date;
}

export interface Document {
  _id: string;
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  empresa: string;
  iat: number;
  exp: number;
}

export interface SocketWithAuth extends Socket {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userEmpresa?: string;
}

export interface ServerWithAuth extends SocketIOServer {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export interface DocumentChange {
  position: number;
  text: string;
  type: 'insert' | 'delete';
  userId: string;
  timestamp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  empresa: string;
  password: string;
  profileImage?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 