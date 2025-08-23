import express from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { buscarUsuariosEmpresa } from '../controllers/adminController.js';

const router = express.Router();

// GET /api/users/empresa
router.get('/empresa', requireAuth, buscarUsuariosEmpresa);

export default router;
