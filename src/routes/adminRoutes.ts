import express from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { getUsers, updateUserPermissions } from '../controllers/adminController.js';

const router = express.Router();

router.get('/users', requireAuth, getUsers);
router.post('/update-user-permissions', requireAuth, updateUserPermissions);

export default router;
