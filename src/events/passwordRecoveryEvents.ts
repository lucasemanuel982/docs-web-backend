import { Socket } from 'socket.io';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { sendPasswordResetEmail } from '../utils/email.js';

export function registrarEventosRecuperacaoSenha(socket: Socket): void {
  console.log('Eventos de recuperação de senha registrados para socket:', socket.id);
  
  socket.on('solicitar_recuperacao_senha', async (dados: { email: string }) => {
    console.log('Solicitação de recuperação de senha recebida:', dados.email);
    try {
      const { email } = dados;
      const usuario = await User.findOne({ email });

      // Por segurança, não revela se o e-mail foi encontrado ou não.
      // Apenas continua o processo se o usuário existir.
      if (usuario) {
        // Gera um token seguro
        const token = crypto.randomBytes(32).toString('hex');
        
        // Define o prazo de validade para 3 minutos a partir de agora
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

        // Remove tokens antigos para o mesmo e-mail para evitar acúmulo
        await PasswordReset.deleteMany({ email });

        // Salva o novo token no banco de dados
        await PasswordReset.create({
          email,
          token,
          expiresAt,
        });

        // Envia o e-mail com o link de redefinição
        await sendPasswordResetEmail(email, token);
      }

      // Envia uma resposta genérica para o cliente
      console.log('Enviando resposta de sucesso para socket:', socket.id);
      socket.emit('recuperacao_sucesso', {
        message: 'Se um usuário com este e-mail existir em nosso sistema, um link de redefinição de senha será enviado.',
      });

    } catch (erro) {
      console.error('Erro ao solicitar recuperação de senha:', erro);
      console.log('Enviando resposta de erro para socket:', socket.id);
      socket.emit('recuperacao_erro', { message: 'Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.' });
    }
  });

  socket.on('resetar_senha', async (dados: { token: string; password: string }) => {
    try {
      const { token, password } = dados;

      // Procura o token no banco de dados
      const passwordReset = await PasswordReset.findOne({
        token,
        used: false, // Garante que o token não foi usado
        expiresAt: { $gt: new Date() }, // Garante que o token não expirou
      });

      // Se o token não for válido, informa o cliente
      if (!passwordReset) {
        return socket.emit('redefinicao_erro', { message: 'Token inválido ou expirado. Por favor, solicite um novo link de redefinição.' });
      }

      // Encontra o usuário associado ao e-mail do token
      const usuario = await User.findOne({ email: passwordReset.email });
      if (!usuario) {
        // Embora improvável, é uma verificação de segurança adicional
        return socket.emit('redefinicao_erro', { message: 'Usuário não encontrado.' });
      }

      // Criptografa a nova senha
      const saltRounds = 10;
      usuario.password = await bcrypt.hash(password, saltRounds);
      await usuario.save();

      // Marca o token como usado para que não possa ser reutilizado
      passwordReset.used = true;
      await passwordReset.save();

      socket.emit('redefinicao_sucesso', { message: 'Sua senha foi redefinida com sucesso! Você já pode fazer login.' });

    } catch (erro) {
      console.error('Erro ao redefinir senha:', erro);
      socket.emit('erro_servidor', { message: 'Erro interno do servidor ao tentar redefinir a senha.' });
    }
  });
}
