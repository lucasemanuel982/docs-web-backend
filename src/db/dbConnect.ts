import mongoose from 'mongoose';
import 'dotenv/config';

// String de conexão do MongoDB Atlas do usuário
const MONGODB_URI = process.env?.MONGODB_URI || '';

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout de 10 segundos
      socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
      bufferCommands: false, // Desabilitar buffer de comandos
    });
    console.log('Conectado ao MongoDB Atlas com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

export default mongoose; 