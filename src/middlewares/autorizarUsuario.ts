import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { adicionarSessao, removerSessao, obterSocketId } from '../utils/sessoesAtivas.ts';
import { JWTPayload, SocketWithAuth } from '../types/index.js';

export function autorizarUsuario(socket: SocketWithAuth, next: (err?: Error) => void): void {
  const tokenJwt = socket.handshake.auth.token as string;

  if (!tokenJwt) {
    return next(new Error('Token não fornecido'));
  }

  try {
    const payloadToken = jwt.verify(tokenJwt, process.env.JWT_SECRET || 'fallback_secret') as JWTPayload;

    // Verifica se já existe uma sessão ativa
    const socketIdAnterior = obterSocketId(tokenJwt);

    if (socketIdAnterior && socketIdAnterior !== socket.id) {
      // Emite o evento para o socket antigo avisando sobre o redirecionamento
      const socketAnterior = (socket as any).server.sockets.sockets.get(socketIdAnterior);
      if (socketAnterior) {
        // Primeiro avisa que será redirecionado
        socketAnterior.emit('aviso_redirecionamento', {
          mensagem: 'Você será redirecionado porque sua conta foi acessada em outra página.'
        });
        
        // Aguarda um tempo para o usuário ver a mensagem antes de desconectar
        setTimeout(() => {
          socketAnterior.emit('deslogar_usuario');
          socketAnterior.disconnect(true);
          removerSessao(tokenJwt);
        }, 2000); // 2 segundos de delay
      }
    }

    console.log("socket.id", socket.id);
    adicionarSessao(tokenJwt, socket.id);

    // Adiciona informações do usuário ao socket
    socket.userId = payloadToken.userId;
    socket.userEmail = payloadToken.email;
    socket.userName = payloadToken.name;
    socket.userEmpresa = payloadToken.empresa;

    socket.emit('autorizacao_sucesso', payloadToken);
    next();
  } catch (erro) {
    next(erro as Error);
  }
} 