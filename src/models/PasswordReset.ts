import mongoose from 'mongoose';

export interface IPasswordReset {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

const passwordResetSchema = new mongoose.Schema<IPasswordReset>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Criar índices
passwordResetSchema.index({ email: 1 });
// Removendo o índice duplicado - o unique: true já cria o índice
// passwordResetSchema.index({ token: 1 }, { unique: true });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const PasswordReset = mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema); 