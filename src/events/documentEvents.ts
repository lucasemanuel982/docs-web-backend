import { Socket, Namespace } from 'socket.io';
import { Document } from '../models/Document.js';
import { User } from '../models/User.js';
import { SocketWithAuth } from '../types/index.js';
import { verificarPermissaoCriarDocumentos } from '../middlewares/verificarPermissoes.js';

interface UsuarioOnline {
  nomeDocumento: string;
  nomeUsuario: string;
  userId: string;
}

const usuariosOnline: Record<string, UsuarioOnline> = {};
const usuariosDigitando: Record<string, Set<string>> = {};

// Função auxiliar para emitir lista de usuários online com imagens
async function emitirUsuariosOnline(documentoId: string, io: Namespace) {
  const usuariosOnlineIds = Object.values(usuariosOnline)
    .filter(u => u.nomeDocumento === documentoId)
    .map(u => u.userId);

  const usuariosInfo = await User.find({ _id: { $in: usuariosOnlineIds } })
    .select('_id name profileImage');

  const usuariosMap = new Map(usuariosInfo.map(user => [user._id.toString(), { name: user.name, profileImage: user.profileImage }]));

  const usuariosNoDocumento = Object.values(usuariosOnline)
    .filter(u => u.nomeDocumento === documentoId)
    .map(u => {
      const userInfo = usuariosMap.get(u.userId) || { name: u.nomeUsuario, profileImage: undefined };
      return { 
        nome: userInfo.name, 
        id: u.userId,
        profileImage: userInfo.profileImage
      };
    });

  io.to(documentoId).emit('usuarios_online', usuariosNoDocumento);
}

export function registroEventoDocumento(socket: SocketWithAuth, io: Namespace): void {
  socket.on('carregar_documentos', async () => {
    try {
      if (!socket.userId || !socket.userEmpresa) return;

      // Buscar todos os usuários da mesma empresa
      const usuariosEmpresa = await User.find({ empresa: socket.userEmpresa }).select('_id name profileImage');
      const idsUsuariosEmpresa = usuariosEmpresa.map(user => user._id.toString());
      const usuariosMap = new Map(usuariosEmpresa.map(user => [user._id.toString(), { name: user.name, profileImage: user.profileImage }]));

      // Buscar documentos que pertencem a usuários da mesma empresa
      const documentos = await Document.find({ 
        $or: [
          { ownerId: { $in: idsUsuariosEmpresa } },
          { collaborators: { $in: idsUsuariosEmpresa } }
        ]
      }).sort({ updatedAt: -1 });

      // Adicionar nome e imagem do proprietário a cada documento
      const documentosComProprietario = documentos.map(doc => {
        const ownerInfo = usuariosMap.get(doc.ownerId) || { name: 'Usuário desconhecido', profileImage: undefined };
        return {
          ...doc.toObject(),
          ownerName: ownerInfo.name,
          ownerProfileImage: ownerInfo.profileImage
        };
      });

      socket.emit('documentos_carregados', documentosComProprietario);
    } catch (erro) {
      console.error('Erro ao carregar documentos:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao carregar documentos' });
    }
  });

  socket.on('selecionar_documento', async ({ documentoId, nomeUsuario }: { documentoId: string; nomeUsuario: string }, callback: (documento: { title: string, content: string, createdAt: string, updatedAt: string, canEdit: boolean } | null) => void) => {
    try {
      if (!socket.userId) {
        callback(null);
        return;
      }

      const documento = await Document.findById(documentoId);

      if (documento) {
        // Verificar permissões do usuário
        const canRead = documento.ownerId === socket.userId || 
                       documento.readPermissions.includes(socket.userId) ||
                       documento.editPermissions.includes(socket.userId);
        
        const canEdit = documento.ownerId === socket.userId || 
                       documento.editPermissions.includes(socket.userId);

        if (!canRead) {
          socket.emit('erro_servidor', { message: 'Você não tem permissão para acessar este documento' });
          callback(null);
          return;
        }

        const usuarioAtual = usuariosOnline[socket.id];
        if (usuarioAtual) {
          const { nomeDocumento: salaAnterior } = usuarioAtual;
          socket.leave(salaAnterior);
        }

        socket.join(documentoId);

        usuariosOnline[socket.id] = { 
          nomeDocumento: documentoId, 
          nomeUsuario,
          userId: socket.userId || ''
        };

        // Emitir lista de usuários online com imagens
        await emitirUsuariosOnline(documentoId, io);

        callback({ 
          title: documento.title, 
          content: documento.content,
          createdAt: documento.createdAt?.toISOString?.() || '',
          updatedAt: documento.updatedAt?.toISOString?.() || '',
          canEdit
        });
      } else {
        callback(null);
      }
    } catch (erro) {
      console.error('Erro ao selecionar documento:', erro);
      callback(null);
    }
  });

  socket.on('texto_editor', async ({ texto, documentoId }: { texto: string; documentoId: string }) => {
    try {
      if (!socket.userId) {
        return;
      }

      // Verificar se o usuário tem permissão de edição
      const documento = await Document.findById(documentoId);
      if (!documento) {
        return;
      }

      const canEdit = documento.ownerId === socket.userId || 
                     documento.editPermissions.includes(socket.userId);

      if (!canEdit) {
        socket.emit('erro_servidor', { message: 'Você não tem permissão para editar este documento' });
        return;
      }

      const resultado = await Document.findByIdAndUpdate(
        documentoId,
        { 
          content: texto,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (resultado) {
        socket.to(documentoId).emit('texto_editor_clientes', texto);
      }
    } catch (erro) {
      console.error('Erro ao atualizar documento:', erro);
    }
  });

  socket.on('comecar_digitacao', ({ documentoId, nomeUsuario }: { documentoId: string; nomeUsuario: string }) => {
    if (!usuariosDigitando[documentoId]) {
      usuariosDigitando[documentoId] = new Set();
    }

    usuariosDigitando[documentoId].add(nomeUsuario);

    socket.to(documentoId).emit('usuario_digitando', {
      nomeUsuario,
      usuariosDigitando: Array.from(usuariosDigitando[documentoId])
    });
  });

  socket.on('parar_digitacao', ({ documentoId, nomeUsuario }: { documentoId: string; nomeUsuario: string }) => {
    if (usuariosDigitando[documentoId]) {
      usuariosDigitando[documentoId].delete(nomeUsuario);

      if (usuariosDigitando[documentoId].size === 0) {
        delete usuariosDigitando[documentoId];
        socket.to(documentoId).emit('usuario_parou_digitacao', {
          nomeUsuario,
          usuariosDigitando: []
        });
      } else {
        socket.to(documentoId).emit('usuario_parou_digitacao', {
          nomeUsuario,
          usuariosDigitando: Array.from(usuariosDigitando[documentoId])
        });
      }
    }
  });

  socket.on('criar_documento', async ({ title, readPermissions = [], editPermissions = [] }: { title: string; readPermissions?: string[]; editPermissions?: string[] }) => {
    try {
      if (!socket.userId || !socket.userName) {
        socket.emit('erro_servidor', { message: 'Usuário não autenticado' });
        return;
      }

      // Verificar permissão para criar documentos
      const temPermissao = await verificarPermissaoCriarDocumentos(socket);
      if (!temPermissao) return;

      // Garantir que o proprietário sempre tenha permissões de leitura e edição
      const finalReadPermissions = [...new Set([...readPermissions, socket.userId])];
      const finalEditPermissions = [...new Set([...editPermissions, socket.userId])];

      const novoDocumento = new Document({
        title,
        content: '',
        ownerId: socket.userId,
        collaborators: [],
        readPermissions: finalReadPermissions,
        editPermissions: finalEditPermissions
      });

      await novoDocumento.save();

      // Adicionar nome do proprietário ao documento
      const documentoComProprietario = {
        ...novoDocumento.toObject(),
        ownerName: socket.userName
      };

      socket.emit('documento_criado', documentoComProprietario);
    } catch (erro) {
      console.error('Erro ao criar documento:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao criar documento' });
    }
  });

  socket.on('deletar_documento', async ({ documentId }: { documentId: string }) => {
    try {
      if (!socket.userId) return;

      const resultado = await Document.findOneAndDelete({ 
        _id: documentId,
        ownerId: socket.userId 
      });

      if (resultado) {
        // Emitir para todos os usuários na sala do documento
        io.to(documentId).emit('documento_deletado', documentId);
        
        // Limpar usuários online e digitando do documento deletado
        Object.keys(usuariosOnline).forEach(socketId => {
          if (usuariosOnline[socketId].nomeDocumento === documentId) {
            delete usuariosOnline[socketId];
          }
        });
        
        if (usuariosDigitando[documentId]) {
          delete usuariosDigitando[documentId];
        }
      }
    } catch (erro) {
      console.error('Erro ao deletar documento:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao deletar documento' });
    }
  });

  socket.on('excluir_documento', async ({ documentoId }: { documentoId: string }) => {
    try {
      if (!socket.userId) return;

      const resultado = await Document.findOneAndDelete({ 
        _id: documentoId,
        ownerId: socket.userId 
      });

      if (resultado) {
        // Emitir para todos os usuários na sala do documento
        io.to(documentoId).emit('documento_excluido', documentoId);
        
        // Limpar usuários online e digitando do documento excluído
        Object.keys(usuariosOnline).forEach(socketId => {
          if (usuariosOnline[socketId].nomeDocumento === documentoId) {
            delete usuariosOnline[socketId];
          }
        });
        
        if (usuariosDigitando[documentoId]) {
          delete usuariosDigitando[documentoId];
        }
      }
    } catch (erro) {
      console.error('Erro ao excluir documento:', erro);
    }
  });

  socket.on('sair_documento', async (documentoId: string) => {
    const usuarioDesconectado = usuariosOnline[socket.id];
    if (usuarioDesconectado && usuarioDesconectado.nomeDocumento === documentoId) {
      socket.leave(documentoId);

      delete usuariosOnline[socket.id];

      // Remover usuário da lista de digitando
      if (usuariosDigitando[documentoId]) {
        usuariosDigitando[documentoId].delete(usuarioDesconectado.nomeUsuario);
        if (usuariosDigitando[documentoId].size === 0) {
          delete usuariosDigitando[documentoId];
        }
      }

      // Emitir lista atualizada de usuários online
      await emitirUsuariosOnline(documentoId, io);
    }
  });

  socket.on('disconnect', async () => {
    const usuarioDesconectado = usuariosOnline[socket.id];

    if (usuarioDesconectado) {
      const { nomeDocumento, nomeUsuario } = usuarioDesconectado;

      delete usuariosOnline[socket.id];

      // Remover usuário da lista de digitando
      if (usuariosDigitando[nomeDocumento]) {
        usuariosDigitando[nomeDocumento].delete(nomeUsuario);
        if (usuariosDigitando[nomeDocumento].size === 0) {
          delete usuariosDigitando[nomeDocumento];
        }
      }

      // Emitir lista atualizada de usuários online
      await emitirUsuariosOnline(nomeDocumento, io);
    }
  });

  // Buscar usuários da empresa para seleção de permissões
  socket.on('buscar_usuarios_empresa', async () => {
    try {
      if (!socket.userEmpresa) {
        socket.emit('erro_servidor', { message: 'Empresa não identificada' });
        return;
      }

      const usuarios = await User.find({ empresa: socket.userEmpresa })
        .select('_id name email')
        .sort({ name: 1 });

      const usuariosFormatados = usuarios.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }));

      socket.emit('usuarios_empresa_carregados', usuariosFormatados);
    } catch (erro) {
      console.error('Erro ao buscar usuários da empresa:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao buscar usuários da empresa' });
    }
  });

  // Atualizar permissões de um documento
  socket.on('atualizar_permissoes_documento', async ({ 
    documentId, 
    readPermissions, 
    editPermissions 
  }: { 
    documentId: string; 
    readPermissions: string[]; 
    editPermissions: string[]; 
  }) => {
    try {
      if (!socket.userId) {
        socket.emit('erro_servidor', { message: 'Usuário não autenticado' });
        return;
      }

      // Verificar se o usuário é o proprietário do documento
      const documento = await Document.findById(documentId);
      if (!documento) {
        socket.emit('erro_servidor', { message: 'Documento não encontrado' });
        return;
      }

      if (documento.ownerId !== socket.userId) {
        socket.emit('erro_servidor', { message: 'Apenas o proprietário pode alterar permissões' });
        return;
      }

      // Garantir que o proprietário sempre tenha permissões de leitura e edição
      const finalReadPermissions = [...new Set([...readPermissions, socket.userId])];
      const finalEditPermissions = [...new Set([...editPermissions, socket.userId])];

      // Verificar se há usuários em edição que não estão em leitura
      const usuariosEmEdicaoSemLeitura = finalEditPermissions.filter(
        userId => !finalReadPermissions.includes(userId)
      );

      if (usuariosEmEdicaoSemLeitura.length > 0) {
        socket.emit('erro_permissoes', { 
          message: 'Usuários com permissão de edição devem ter também permissão de leitura' 
        });
        return;
      }

      // Atualizar documento
      const documentoAtualizado = await Document.findByIdAndUpdate(
        documentId,
        {
          readPermissions: finalReadPermissions,
          editPermissions: finalEditPermissions
        },
        { new: true }
      );

      if (documentoAtualizado) {
        socket.emit('permissoes_atualizadas', {
          message: 'Permissões atualizadas com sucesso',
          documentId,
          readPermissions: finalReadPermissions,
          editPermissions: finalEditPermissions
        });
      }
    } catch (erro) {
      console.error('Erro ao atualizar permissões:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao atualizar permissões' });
    }
  });
} 