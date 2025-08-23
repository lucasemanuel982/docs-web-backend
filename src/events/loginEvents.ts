import { Socket, Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { adicionarSessao, removerSessao, obterSocketId, obterTodasSessoes } from '../utils/sessoesAtivas.js'
import { LoginRequest, RegisterRequest, JWTPayload } from '../types/index.js';
import { validateBase64Image } from '../utils/imageValidation.js';

export function registrarEventosLogin(socket: Socket, io: SocketIOServer): void {
  socket.on('verificar_sessao', (tokenJWT: string) => {
    console.log("socket.id", socket.id)
    const socketIdAnterior = obterSocketId(tokenJWT);
    if (socketIdAnterior && socketIdAnterior !== socket.id) {
      console.log('Sessão duplicada detectada:', socketIdAnterior);

      // Emite o evento para o socket antigo avisando sobre o redirecionamento
      const socketAnterior = io.sockets.sockets.get(socketIdAnterior);
      if (socketAnterior) {
        // Primeiro avisa que será redirecionado
        socketAnterior.emit('aviso_redirecionamento', {
          mensagem: 'Você será redirecionado porque sua conta foi acessada em outra página.'
        });

        // Aguarda um tempo para o usuário ver a mensagem antes de desconectar
        setTimeout(() => {
          socketAnterior.emit('sessao_duplicada');
        }, 2000); // 2 segundos de delay
      }
    }
  });

  socket.on('logout_usuario', (tokenJWT: string) => {
    if (tokenJWT) {
      removerSessao(tokenJWT);
      console.log('Usuário deslogado - sessão removida:', tokenJWT);
    }
  });

  socket.on('autenticar_usuario', async (dados: LoginRequest) => {
    try {
      const { email, password } = dados;

      // Buscar usuário por email
      const usuario = await User.findOne({ email });

      if (!usuario) {
        socket.emit('autenticacao_erro', { message: 'Email ou senha incorretos' });
        return;
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(password, usuario.password);

      if (!senhaValida) {
        socket.emit('autenticacao_erro', { message: 'Email ou senha incorretos' });
        return;
      }

      // Gerar JWT
      const payload: JWTPayload = {
        userId: usuario._id.toString(),
        email: usuario.email,
        name: usuario.name,
        empresa: usuario.empresa,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      };

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
      }
      const tokenJWT = jwt.sign(payload, process.env.JWT_SECRET);


      // Adiciona a nova sessão
      console.log("socket.id", socket.id)
      adicionarSessao(tokenJWT, socket.id);


      socket.emit('autenticacao_sucesso', {
        token: tokenJWT,
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
      console.error('Erro no processo de login:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });

  socket.on('registrar_usuario', async (dados: RegisterRequest) => {
    try {
      const { name, email, empresa, password, profileImage } = dados;

      // Verificar se o usuário já existe
      const usuarioExistente = await User.findOne({ email });
      if (usuarioExistente) {
        socket.emit('registro_erro', { message: 'Email já cadastrado' });
        return;
      }

      // Validar imagem de perfil se fornecida
      if (profileImage && profileImage.trim() !== '') {
        const validationResult = validateBase64Image(profileImage);
        if (!validationResult.isValid) {
          socket.emit('registro_erro', { message: validationResult.error || 'Imagem de perfil inválida' });
          return;
        }
      }

      // Criptografar senha
      const saltRounds = 10;
      const senhaCriptografada = await bcrypt.hash(password, saltRounds);

      // Criar novo usuário
      const novoUsuario = new User({
        name,
        email,
        empresa,
        password: senhaCriptografada,
        profileImage
      });

      await novoUsuario.save();

      // Gerar JWT para login automático
      const payload: JWTPayload = {
        userId: novoUsuario._id.toString(),
        email: novoUsuario.email,
        name: novoUsuario.name,
        empresa: novoUsuario.empresa,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      };

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
      }
      const tokenJWT = jwt.sign(payload, process.env.JWT_SECRET);

      // Adiciona a nova sessão
      adicionarSessao(tokenJWT, socket.id);

      socket.emit('registro_sucesso', {
        message: 'Usuário registrado com sucesso',
        token: tokenJWT,
        user: {
          id: novoUsuario._id.toString(),
          name: novoUsuario.name,
          email: novoUsuario.email,
          empresa: novoUsuario.empresa,
          tipoUsuario: novoUsuario.tipoUsuario,
          profileImage: novoUsuario.profileImage
        }
      });
    } catch (erro) {
      console.error('Erro no processo de registro:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });

  socket.on('recuperar_senha', async (dados: { email: string }) => {
    try {
      const { email } = dados;

      // Verificar se o usuário existe
      const usuario = await User.findOne({ email });
      if (!usuario) {
        // Por segurança, não informamos se o email existe ou não
        socket.emit('recuperacao_sucesso', { message: 'Email de recuperação enviado com sucesso!' });
        return;
      }

      // Gerar token de recuperação
      const resetToken = 'placeholder_token'; // generateResetToken(); // Desabilitado
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Salvar token no banco
      const passwordReset = new PasswordReset({
        email,
        token: resetToken,
        expiresAt
      });

      await passwordReset.save();

      // Gerar URL de recuperação
      const resetUrl = 'placeholder_url'; // generateResetUrl(resetToken); // Desabilitado

      // Enviar email
      const emailEnviado = true; // await sendPasswordResetEmail(email, resetUrl); // Desabilitado

      if (emailEnviado) {
        socket.emit('recuperacao_sucesso', { message: 'Email de recuperação enviado com sucesso!' });
      } else {
        socket.emit('recuperacao_erro', { message: 'Erro ao enviar email de recuperação' });
      }
    } catch (erro) {
      console.error('Erro no processo de recuperação de senha:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });

  socket.on('redefinir_senha', async (dados: { token: string; password: string }) => {
    try {
      const { token, password } = dados;

      // Buscar token válido
      const passwordReset = await PasswordReset.findOne({
        token,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!passwordReset) {
        socket.emit('redefinicao_erro', { message: 'Token inválido ou expirado' });
        return;
      }

      // Buscar usuário
      const usuario = await User.findOne({ email: passwordReset.email });
      if (!usuario) {
        socket.emit('redefinicao_erro', { message: 'Usuário não encontrado' });
        return;
      }

      // Criptografar nova senha
      const saltRounds = 10;
      const novaSenhaCriptografada = await bcrypt.hash(password, saltRounds);

      // Atualizar senha do usuário
      usuario.password = novaSenhaCriptografada;
      await usuario.save();

      // Marcar token como usado
      passwordReset.used = true;
      await passwordReset.save();

      // Enviar email de confirmação
      // await sendPasswordChangedEmail(usuario.email); // Desabilitado

      socket.emit('redefinicao_sucesso', { message: 'Senha redefinida com sucesso!' });
    } catch (erro) {
      console.error('Erro no processo de redefinição de senha:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor' });
    }
  });



  socket.on('disconnect', () => {
    // Remove a sessão quando o socket é desconectado
    const todasSessoes = obterTodasSessoes();
    for (const [tokenJWT, socketId] of todasSessoes.entries()) {
      if (socketId === socket.id) {
        removerSessao(tokenJWT);
        break;
      }
    }
  });
} 