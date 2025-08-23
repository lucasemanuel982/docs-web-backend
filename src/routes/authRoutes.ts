import express from 'express';
import { 
  login, 
  register, 
  forgotPassword, 
  resetPassword, 
  logout, 
  verifySession, 
  updateProfile, 
  updatePassword 
} from '../controllers/authController.js';

import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

// Rotas públicas
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rotas que requerem autenticação

// Novos endpoints REST para atualização de perfil e senha
router.post('/update-profile', requireAuth, updateProfile);
router.post('/update-password', requireAuth, updatePassword);

router.post('/logout', logout);
router.get('/verify-session', verifySession);

export default router; 