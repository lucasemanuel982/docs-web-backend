import mongoose from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password: string;
  empresa: string;
  tipoUsuario: 'user' | 'admin' | 'principal';
  profileImage?: string; // Imagem de perfil em base64
  permissions?: {
    canCreateDocuments: boolean;
    canEditProfile: boolean;
    canReadDocuments: boolean;
    canEditDocuments: boolean;
    canChangeUserTipo: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  empresa: {
    type: String,
    required: true,
    trim: true
  },
  tipoUsuario: {
    type: String,
    enum: ['user', 'admin', 'principal'],
    default: 'user'
  },
  profileImage: {
    type: String,
    required: false
  },
  permissions: {
    canCreateDocuments: {
      type: Boolean,
      default: false
    },
    canEditProfile: {
      type: Boolean,
      default: false
    },
    canReadDocuments: {
      type: Boolean,
      default: false
    },
    canEditDocuments: {
      type: Boolean,
      default: false
    },
    canChangeUserTipo: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Removendo o índice duplicado - o unique: true já cria o índice
// userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', userSchema); 