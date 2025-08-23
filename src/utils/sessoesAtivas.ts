// Armazena as sessões ativas dos usuários
const sessoesAtivas = new Map<string, string>();

function adicionarSessao(tokenJWT: string, socketId: string): void {
  console.log(`Adicionando sessão - Token: ${tokenJWT}, SocketId: ${socketId}`);
  sessoesAtivas.set(tokenJWT, socketId);
  console.log('Sessões ativas:', Array.from(sessoesAtivas.entries()));
}

function removerSessao(tokenJWT: string): void {
  console.log(`Removendo sessão para token: ${tokenJWT.substring(0, 20)}...`);
  const removido = sessoesAtivas.delete(tokenJWT);
  console.log(`Sessão removida: ${removido ? 'sim' : 'não'}`);
  console.log('Sessões restantes:', Array.from(sessoesAtivas.entries()));
}

function obterSocketId(tokenJWT: string): string | undefined {
  return sessoesAtivas.get(tokenJWT);
}

function obterTodasSessoes(): Map<string, string> {
  return sessoesAtivas;
}

function limparSessoes(): void {
  sessoesAtivas.clear();
}

function desconectarTodasSessoes(io: any): void {
  console.log('Desconectando todas as sessões ativas...');
  const todasSessoes = Array.from(sessoesAtivas.entries());
  
  todasSessoes.forEach(([tokenJWT, socketId]) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      console.log(`Desconectando socket ${socketId} para token ${tokenJWT}`);
      socket.emit('deslogar_usuario');
      socket.disconnect(true);
    }
  });
  
  sessoesAtivas.clear();
  console.log('Todas as sessões foram desconectadas e limpas');
} 

export { adicionarSessao, removerSessao, obterSocketId, obterTodasSessoes, limparSessoes, desconectarTodasSessoes };