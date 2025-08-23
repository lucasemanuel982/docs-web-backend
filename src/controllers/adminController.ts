import { Request, Response } from 'express';
import { User } from '../models/User.js';
// Buscar todos os usuários da empresa do usuário autenticado
export const buscarUsuariosEmpresa = async (req: Request, res: Response) => {
  try {
    const empresa = req.user?.empresa;
    if (!empresa) return res.status(400).json({ success: false, message: 'Empresa não encontrada no token.' });
    const usuarios = await User.find({ empresa }).select('-password');
    res.json({ success: true, usuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar usuários da empresa.' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const empresa = req.user?.empresa;
    if (!empresa) return res.status(400).json({ success: false, message: 'Empresa não encontrada no token.' });
    const users = await User.find({ empresa });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar usuários.' });
  }
};

export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId, permissions, tipoUsuario } = req.body;
    if (!userId || !permissions || !tipoUsuario) {
      return res.status(400).json({ success: false, message: 'Dados incompletos.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    user.permissions = permissions;
    user.tipoUsuario = tipoUsuario;
    await user.save();
    res.json({ success: true, message: 'Permissões atualizadas com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar permissões.' });
  }
};
