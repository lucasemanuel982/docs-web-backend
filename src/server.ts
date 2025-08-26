import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import 'dotenv/config';

import { connectToDatabase } from './db/dbConnect.js';
import { autorizarUsuario } from './middlewares/autorizarUsuario.js';
import { registrarEventosLogin } from './events/loginEvents.js';
import { registrarEventosRecuperacaoSenha } from './events/passwordRecoveryEvents.js';
import { registroEventoDocumento } from './events/documentEvents.js';
import { registrarEventosPerfil } from './events/profileEvents.js';
import { desconectarTodasSessoes, removerSessao, obterTodasSessoes } from './utils/sessoesAtivas.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const porta = process.env.PORT || 3333;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Conectar ao banco de dados
connectToDatabase();

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);

// Criar servidor HTTP
const servidorHttp = http.createServer(app);

// Configurar Socket.IO
const io = new SocketIOServer(servidorHttp, {
  cors: {
    // origin: process.env.CLIENT_URL || "http://localhost:3000",
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Namespace para usuários autenticados
const nspUsuarios = io.of('/usuarios');
nspUsuarios.use(autorizarUsuario);

nspUsuarios.on('connection', (socket) => {

  // Registrar eventos de documento
  registroEventoDocumento(socket, nspUsuarios);

  // Registrar eventos de perfil
  registrarEventosPerfil(socket, nspUsuarios);

  socket.on('logout_usuario', (tokenJWT: string) => {
    if (tokenJWT) {
      removerSessao(tokenJWT);
      console.log('Usuário deslogado - sessão removida:', tokenJWT);
    }
  });

  // socket.on('disconnect', () => {
  //   console.log('Usuário autenticado desconectado:', socket.id);
  // });
});

// Namespace público para login/registro
io.of('/').on('connection', (socket) => {
  // Registrar eventos de login
  registrarEventosLogin(socket, io);

  // Registrar eventos de recuperação de senha
  registrarEventosRecuperacaoSenha(socket);

  // socket.on('disconnect', () => {
  //   // console.log('Usuário público desconectado:', socket.id);
  // });
});

// Rotas da API
app.get('/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

// Endpoint para limpar todas as sessões ativas
app.post('/api/admin/clear-sessions', (req, res) => {
  try {
    desconectarTodasSessoes(io);
    res.json({
      success: true,
      message: 'Todas as sessões foram desconectadas e limpas',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao limpar sessões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar sessões',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Endpoint para verificar sessões ativas
app.get('/api/admin/sessions', (req, res) => {
  try {
    const sessoes = obterTodasSessoes();
    res.json({
      success: true,
      sessions: Array.from(sessoes.entries()),
      count: sessoes.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter sessões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter sessões',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Endpoint para testar email (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      const { sendPasswordResetEmail } = await import('./utils/email.js');
      await sendPasswordResetEmail(email, 'test-token-123');

      res.json({
        success: true,
        message: 'Email de teste enviado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar email de teste',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}

// Iniciar servidor
servidorHttp.listen(porta, () => {
  console.log(`Servidor rodando na porta ${porta}`);
  console.log(`Socket.IO configurado`);
  console.log(`CORS habilitado para: ${process.env.CLIENT_URL || "http://localhost:3000"}`);

  // Mostrar status do serviço de email
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    console.log(`Serviço de email configurado: ${smtpUser}`);
  } else {
    console.log(`Serviço de email: Não configurado (SMTP_USER e SMTP_PASS necessários)`);
  }
}); 