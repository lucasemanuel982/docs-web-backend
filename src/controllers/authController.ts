// Atualizar perfil do usuário
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.body.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });

    const { name, email, empresa, profileImage } = req.body;
    const update: any = { name, email };
    if (empresa !== undefined) update.empresa = empresa;
    if (profileImage !== undefined) update.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    res.json({ success: true, user, message: 'Perfil atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
  }
};

// Atualizar senha do usuário
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.body.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Dados incompletos' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    const senhaValida = await bcrypt.compare(currentPassword, user.password);
    if (!senhaValida) return res.status(401).json({ success: false, message: 'Senha atual incorreta' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar senha' });
  }
};
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { adicionarSessao, removerSessao, obterSocketId, obterTodasSessoes } from '../utils/sessoesAtivas.ts';
import { LoginRequest, RegisterRequest, JWTPayload, ApiResponse } from '../types/index.js';
import { validateBase64Image } from '../utils/imageValidation.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import crypto from 'crypto';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Buscar usuário por email
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(password, usuario.password);

    if (!senhaValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
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

    const tokenJWT = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret');



    const response: ApiResponse = {
      success: true,
      data: {
        token: tokenJWT,
        user: {
          id: usuario._id.toString(),
          name: usuario.name,
          email: usuario.email,
          empresa: usuario.empresa,
          tipoUsuario: usuario.tipoUsuario,
          profileImage: usuario.profileImage
        }
      },
      message: 'Login realizado com sucesso'
    };

    res.status(200).json(response);
  } catch (erro) {
    console.error('Erro no processo de login:', erro);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, empresa, password, profileImage }: RegisterRequest = req.body;

    // Verificar se o usuário já existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email já cadastrado' 
      });
    }

    // Validar imagem de perfil se fornecida
    if (profileImage && profileImage.trim() !== '') {
      const validationResult = validateBase64Image(profileImage);
      if (!validationResult.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: validationResult.error || 'Imagem de perfil inválida' 
        });
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

    const tokenJWT = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret');



    const response: ApiResponse = {
      success: true,
      data: {
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
      }
    };

    res.status(201).json(response);
  } catch (erro) {
    console.error('Erro no processo de registro:', erro);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email }: { email: string } = req.body;

    // Verificar se o usuário existe
    const usuario = await User.findOne({ email });
    if (!usuario) {
      // Por segurança, não informamos se o email existe ou não
      return res.status(200).json({ 
        success: true, 
        message: 'Email de recuperação enviado com sucesso!' 
      });
    }

    // Gerar token de recuperação único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    const passwordReset = new PasswordReset({
      email,
      token: resetToken,
      expiresAt
    });

    await passwordReset.save();

    try {
      // Enviar email
      await sendPasswordResetEmail(email, resetToken);
      
      res.status(200).json({ 
        success: true, 
        message: 'Email de recuperação enviado com sucesso!' 
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      
      // Se falhar ao enviar email, remover o token do banco
      await PasswordReset.deleteOne({ email, token: resetToken });
      
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar email de recuperação. Tente novamente.' 
      });
    }
  } catch (erro) {
    console.error('Erro no processo de recuperação de senha:', erro);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password }: { token: string; password: string } = req.body;

    // Buscar token válido
    const passwordReset = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido ou expirado' 
      });
    }

    // Buscar usuário
    const usuario = await User.findOne({ email: passwordReset.email });
    if (!usuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
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

    // Enviar email de confirmação (opcional)
    try {
      // await sendPasswordChangedEmail(usuario.email); // Implementar se necessário
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não falhar a operação se o email de confirmação falhar
    }

    res.status(200).json({ 
      success: true, 
      message: 'Senha redefinida com sucesso!' 
    });
  } catch (erro) {
    console.error('Erro no processo de redefinição de senha:', erro);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      removerSessao(token);
      console.log('Usuário deslogado - sessão removida:', token);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Logout realizado com sucesso' 
    });
  } catch (erro) {
    console.error('Erro no processo de logout:', erro);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const verifySession = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    // Verificar se o token é válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JWTPayload;
    
    // Buscar usuário atualizado
    const usuario = await User.findById(decoded.userId);
    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        user: {
          id: usuario._id.toString(),
          name: usuario.name,
          email: usuario.email,
          empresa: usuario.empresa,
          tipoUsuario: usuario.tipoUsuario,
          profileImage: usuario.profileImage
        }
      }
    });
  } catch (erro) {
    console.error('Erro na verificação de sessão:', erro);
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido ou expirado' 
    });
  }
}; 