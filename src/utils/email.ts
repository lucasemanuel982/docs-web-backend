
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configurar transporter SMTP do Google
const createTransporter = () => {
  const smtpConfig = {
    service: 'gmail', // Usar serviço Gmail
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Senha de app do Google
    },
  };

  console.log('Configurando SMTP Gmail:', {
    user: smtpConfig.auth.user ? 'Configurado' : 'Não configurado'
  });

  return nodemailer.createTransport(smtpConfig);
};

// Verifica se as configurações de email estão disponíveis
const isEmailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  try {
    // Verifica se o email está configurado
    if (!isEmailConfigured()) {
      console.log('Email não configurado - simulando envio');
      console.log(`Simulação: Email enviado para ${to} com token ${token}`);
      return;
    }

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">Redefinição de Senha - Docs Web</h2>
          <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
          </div>
          <p>Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.</p>
          <p>Este link é válido por <strong>1 hora</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 0.9em; color: #aaa;">Com os melhores cumprimentos,<br />A Equipe do Docs Web</p>
        </div>
      </div>
    `;

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Docs Web'}" <${process.env.SMTP_USER}>`,
      to,
      subject: "Recuperação de Senha - Docs Web",
      html: emailHtml,
    };

    console.log('Enviando email para:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso:', result.messageId);
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};
