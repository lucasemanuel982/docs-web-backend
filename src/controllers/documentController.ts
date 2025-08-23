import { Request, Response } from 'express';
import { Document } from '../models/Document.js';
import { User } from '../models/User.js';


// Listar documentos do usuário autenticado
export async function getUserDocuments(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const documents = await Document.find({
      $or: [
        { ownerId: userId },
        { collaborators: userId },
        { readPermissions: userId },
        { editPermissions: userId }
      ]
    });

    // Buscar dados dos proprietários
    const ownerIds = [...new Set(documents.map(doc => doc.ownerId))];
    const owners = await User.find({ _id: { $in: ownerIds } }).select('name profileImage tipoUsuario');
    const ownersMap = new Map(owners.map(u => [String(u._id), u]));

    // Adiciona ownerName e ownerProfileImage SOMENTE se tipoUsuario === 'principal'
    const documentsWithOwner = documents.map(doc => {
      const owner = ownersMap.get(String(doc.ownerId));
      if (owner && owner.tipoUsuario === 'principal') {
        return {
          ...doc.toObject(),
          ownerName: owner.name,
          ownerProfileImage: owner.profileImage
        };
      } else {
        return {
          ...doc.toObject(),
          ownerName: '',
          ownerProfileImage: ''
        };
      }
    });
    res.json({ documents: documentsWithOwner });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar documentos', error: err });
  }
}

// Criar novo documento
export async function createDocument(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const { title, content } = req.body;
    const doc = await Document.create({
      title,
      content,
      ownerId: userId,
      collaborators: [],
      readPermissions: [userId],
      editPermissions: [userId]
    });
    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar documento', error: err });
  }
}

// Obter documento por ID
export async function getDocumentById(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado' });
    // Verifica permissão de leitura
    if (
      doc.ownerId !== userId &&
      !doc.collaborators.includes(userId) &&
      !doc.readPermissions.includes(userId) &&
      !doc.editPermissions.includes(userId)
    ) {
      return res.status(403).json({ message: 'Sem permissão para acessar este documento' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar documento', error: err });
  }
}

// Atualizar documento por ID
export async function updateDocument(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado' });
    // Verifica permissão de edição
    if (
      doc.ownerId !== userId &&
      !doc.collaborators.includes(userId) &&
      !doc.editPermissions.includes(userId)
    ) {
      return res.status(403).json({ message: 'Sem permissão para editar este documento' });
    }
    doc.title = req.body.title ?? doc.title;
    doc.content = req.body.content ?? doc.content;
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar documento', error: err });
  }
}

// Deletar documento por ID
export async function deleteDocument(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado' });
    // Apenas o dono pode deletar
    if (doc.ownerId !== userId) {
      return res.status(403).json({ message: 'Apenas o dono pode deletar este documento' });
    }
    await doc.deleteOne();

    // Emitir evento para todos os sockets na sala do documento
    if (req.app.get('io')) {
      req.app.get('io').to(doc._id.toString()).emit('excluir_documento', doc._id.toString());
    }

    res.json({ message: 'Documento deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao deletar documento', error: err });
  }
}

// Listar permissões de um documento
export async function getDocumentPermissions(req: Request, res: Response) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado' });
    res.json({
      readPermissions: doc.readPermissions,
      editPermissions: doc.editPermissions,
      collaborators: doc.collaborators
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar permissões', error: err });
  }
}

// Atualizar permissões de um documento
export async function updateDocumentPermissions(req: Request, res: Response) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado' });
    doc.readPermissions = req.body.readPermissions ?? doc.readPermissions;
    doc.editPermissions = req.body.editPermissions ?? doc.editPermissions;
    doc.collaborators = req.body.collaborators ?? doc.collaborators;
    await doc.save();
    res.json({ message: 'Permissões atualizadas com sucesso', doc });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar permissões', error: err });
  }
}
