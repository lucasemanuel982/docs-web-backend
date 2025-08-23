import express from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import * as documentController from '../controllers/documentController.js';

const router = express.Router();

// Listar documentos do usuário autenticado
router.get('/', requireAuth, documentController.getUserDocuments);

// Criar novo documento
router.post('/', requireAuth, documentController.createDocument);

// Obter documento por ID
router.get('/:id', requireAuth, documentController.getDocumentById);

// Atualizar documento por ID
router.put('/:id', requireAuth, documentController.updateDocument);

// Deletar documento por ID
router.delete('/:id', requireAuth, documentController.deleteDocument);

// Listar permissões de um documento
router.get('/:id/permissions', requireAuth, documentController.getDocumentPermissions);

// Atualizar permissões de um documento
router.put('/:id/permissions', requireAuth, documentController.updateDocumentPermissions);

export default router;
