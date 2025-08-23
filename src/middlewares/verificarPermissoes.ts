import { SocketWithAuth } from '../types/index.js';
import { User } from '../models/User.js';

export interface PermissionCheck {
  canCreateDocuments?: boolean;
  canEditProfile?: boolean;
  canReadDocuments?: boolean;
  canEditDocuments?: boolean;
  canChangeUserTipo?: boolean;
}

export async function verificarPermissoes(
  socket: SocketWithAuth, 
  permissions: PermissionCheck
): Promise<boolean> {
  try {
    if (!socket.userId) {
      socket.emit('erro_servidor', { message: 'Usuário não autenticado' });
      return false;
    }

    const usuario = await User.findById(socket.userId);
    if (!usuario) {
      socket.emit('erro_servidor', { message: 'Usuário não encontrado' });
      return false;
    }

    // Usuários principais têm todas as permissões
    if (usuario.tipoUsuario === 'principal') {
      return true;
    }

    // Verificar permissões específicas
    const userPermissions = usuario.permissions || {};
    
    for (const [permission, required] of Object.entries(permissions)) {
      if (required && !userPermissions[permission as keyof typeof userPermissions]) {
        socket.emit('erro_servidor', { 
          message: `Acesso negado. Você não tem permissão para ${getPermissionMessage(permission)}` 
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    socket.emit('erro_servidor', { message: 'Erro ao verificar permissões' });
    return false;
  }
}

function getPermissionMessage(permission: string): string {
  switch (permission) {
    case 'canCreateDocuments':
      return 'criar documentos';
    case 'canEditProfile':
      return 'editar perfil';
    case 'canReadDocuments':
      return 'ler documentos';
    case 'canEditDocuments':
      return 'editar documentos';
    case 'canChangeUserTipo':
      return 'alterar Tipo dos usuários';
    default:
      return 'realizar esta ação';
  }
}

// Funções auxiliares para verificar permissões específicas
export async function verificarPermissaoCriarDocumentos(socket: SocketWithAuth): Promise<boolean> {
  return verificarPermissoes(socket, { canCreateDocuments: true });
}

export async function verificarPermissaoEditarPerfil(socket: SocketWithAuth): Promise<boolean> {
  return verificarPermissoes(socket, { canEditProfile: true });
}

export async function verificarPermissaoLerDocumentos(socket: SocketWithAuth): Promise<boolean> {
  return verificarPermissoes(socket, { canReadDocuments: true });
}

export async function verificarPermissaoEditarDocumentos(socket: SocketWithAuth): Promise<boolean> {
  return verificarPermissoes(socket, { canEditDocuments: true });
}

export async function verificarPermissaoAlterarTipo(socket: SocketWithAuth): Promise<boolean> {
  return verificarPermissoes(socket, { canChangeUserTipo: true });
} 