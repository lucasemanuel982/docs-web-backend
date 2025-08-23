import { Socket, Namespace } from 'socket.io';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { SocketWithAuth } from '../types/index.js';
import { validateBase64Image } from '../utils/imageValidation.js';

export function registrarEventosPerfil(socket: SocketWithAuth, io: Namespace): void {
  socket.on('atualizar_perfil', async (dados: { name: string; email: string; empresa?: string; profileImage?: string }) => {
    try {
      const { name, email, empresa, profileImage } = dados;

      // Verificar se o email já está sendo usado por outro usuário
      const usuarioExistente = await User.findOne({ email });
      if (usuarioExistente && usuarioExistente._id.toString() !== socket.userId) {
        socket.emit('atualizacao_perfil_erro', { message: 'Email já está sendo usado por outro usuário' });
        return;
      }

      // Buscar usuário atual
      const usuario = await User.findById(socket.userId);
      if (!usuario) {
        socket.emit('atualizacao_perfil_erro', { message: 'Usuário não encontrado' });
        return;
      }

      // Atualizar dados do usuário
      usuario.name = name;
      usuario.email = email;

      // Atualizar imagem de perfil se fornecida
      if (profileImage !== undefined) {
        // Validar imagem se for fornecida
        if (profileImage && profileImage.trim() !== '') {
          const validationResult = validateBase64Image(profileImage);
          if (!validationResult.isValid) {
            socket.emit('atualizacao_perfil_erro', { message: validationResult.error || 'Imagem inválida' });
            return;
          }
        }
        usuario.profileImage = profileImage;
      }

      // Apenas administradores podem editar a empresa
      if (empresa !== undefined && usuario.tipoUsuario === 'admin') {
        usuario.empresa = empresa;
      }
      // Para usuários não-admin, o campo empresa permanece inalterado e não visível

      await usuario.save();

      socket.emit('atualizacao_perfil_sucesso', {
        message: 'Perfil atualizado com sucesso!',
        user: {
          id: usuario._id.toString(),
          name: usuario.name,
          email: usuario.email,
          empresa: usuario.empresa,
          tipoUsuario: usuario.tipoUsuario,
          profileImage: usuario.profileImage
        }
      });
    } catch (erro) {
      console.error('Erro na atualização do perfil:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });

  socket.on('atualizar_senha', async (dados: { currentPassword: string; newPassword: string }) => {
    try {
      const { currentPassword, newPassword } = dados;

      // Buscar usuário atual
      const usuario = await User.findById(socket.userId);
      if (!usuario) {
        socket.emit('atualizacao_senha_erro', { message: 'Usuário não encontrado' });
        return;
      }

      // Verificar senha atual
      const senhaAtualValida = await bcrypt.compare(currentPassword, usuario.password);
      if (!senhaAtualValida) {
        socket.emit('atualizacao_senha_erro', { message: 'Senha atual incorreta' });
        return;
      }

      // Criptografar nova senha
      const saltRounds = 10;
      const novaSenhaCriptografada = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar senha do usuário
      usuario.password = novaSenhaCriptografada;
      await usuario.save();

      socket.emit('atualizacao_senha_sucesso', { message: 'Senha alterada com sucesso!' });
    } catch (erro) {
      console.error('Erro na atualização da senha:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });

  // Buscar usuários da empresa para administração (apenas para usuários principais)
  socket.on('buscar_usuarios_empresa_admin', async () => {
    try {
      if (!socket.userEmpresa) {
        socket.emit('erro_servidor', { message: 'Empresa não identificada' });
        return;
      }

      // Verificar se o usuário é principal
      const usuario = await User.findById(socket.userId);
      if (!usuario || usuario.tipoUsuario !== 'principal') {
        socket.emit('erro_servidor', { message: 'Acesso negado. Apenas usuários principais podem acessar esta funcionalidade.' });
        return;
      }

      const usuarios = await User.find({ empresa: socket.userEmpresa })
        .select('_id name email tipoUsuario permissions')
        .sort({ name: 1 });

      const usuariosFormatados = usuarios.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        tipoUsuario: user.tipoUsuario,
        permissions: user.permissions || {
          canCreateDocuments: false,
          canEditProfile: false,
          canReadDocuments: false,
          canEditDocuments: false,
          canChangeUserTipo: false
        }
      }));

      socket.emit('usuarios_empresa_admin_carregados', usuariosFormatados);
    } catch (erro) {
      console.error('Erro ao buscar usuários da empresa para admin:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao buscar usuários da empresa' });
    }
  });

  // Atualizar permissões de um usuário (apenas para usuários principais)
  socket.on('atualizar_permissoes_usuario', async (dados: {
    userId: string;
    permissions: any;
    tipoUsuario: string
  }) => {
    try {
      if (!socket.userId) {
        socket.emit('erro_servidor', { message: 'Usuário não autenticado' });
        return;
      }

      // Verificar se o usuário atual é principal
      const usuarioAtual = await User.findById(socket.userId);
      if (!usuarioAtual || usuarioAtual.tipoUsuario !== 'principal') {
        socket.emit('erro_servidor', { message: 'Acesso negado. Apenas usuários principais podem alterar permissões.' });
        return;
      }

      const { userId, permissions, tipoUsuario } = dados;

      // Verificar se o usuário a ser alterado existe e é da mesma empresa
      const usuarioParaAlterar = await User.findById(userId);
      if (!usuarioParaAlterar) {
        socket.emit('erro_servidor', { message: 'Usuário não encontrado' });
        return;
      }

      if (usuarioParaAlterar.empresa !== socket.userEmpresa) {
        socket.emit('erro_servidor', { message: 'Usuário não pertence à mesma empresa' });
        return;
      }

      // Validações específicas
      if (userId === socket.userId && tipoUsuario !== 'principal') {
        socket.emit('erro_servidor', { message: 'Você não pode alterar seu próprio tipoUsuario de principal' });
        return;
      }

      // Verificar se está tentando criar outro usuário principal
      if (tipoUsuario === 'principal' && usuarioParaAlterar.tipoUsuario !== 'principal') {
        const usuariosPrincipais = await User.countDocuments({
          empresa: socket.userEmpresa,
          tipoUsuario: 'principal'
        });

        if (usuariosPrincipais >= 1) {
          socket.emit('erro_servidor', { message: 'Apenas um usuário pode ter o tipoUsuario principal' });
          return;
        }
      }

      // Atualizar usuário
      usuarioParaAlterar.tipoUsuario = tipoUsuario as 'user' | 'admin' | 'principal';
      usuarioParaAlterar.permissions = {
        canCreateDocuments: permissions.canCreateDocuments || false,
        canEditProfile: permissions.canEditProfile || false,
        canReadDocuments: permissions.canReadDocuments || false,
        canEditDocuments: permissions.canEditDocuments || false,
        canChangeUserTipo: permissions.canChangeUserTipo || false
      };

      await usuarioParaAlterar.save();

      socket.emit('permissoes_usuario_atualizadas', {
        message: 'Permissões atualizadas com sucesso!',
        userId: userId
      });
    } catch (erro) {
      console.error('Erro ao atualizar permissões do usuário:', erro);
      socket.emit('erro_servidor', { message: 'Erro ao atualizar permissões' });
    }
  });
} 