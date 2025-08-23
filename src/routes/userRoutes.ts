import express from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { buscarUsuariosEmpresa } from '../controllers/adminController';

const router = express.Router();

// GET /api/users/empresa
router.get('/empresa', requireAuth, buscarUsuariosEmpresa);

export default router;
