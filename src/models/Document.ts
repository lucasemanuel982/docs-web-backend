import mongoose from 'mongoose';

export interface IDocument {
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  readPermissions: string[]; // IDs dos usuários com permissão de leitura
  editPermissions: string[]; // IDs dos usuários com permissão de edição
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new mongoose.Schema<IDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  ownerId: {
    type: String,
    required: true
  },
  collaborators: [{
    type: String,
    default: []
  }],
  readPermissions: [{
    type: String,
    default: []
  }],
  editPermissions: [{
    type: String,
    default: []
  }]
}, {
  timestamps: true
});

// Criar índices
documentSchema.index({ ownerId: 1 });
documentSchema.index({ collaborators: 1 });
documentSchema.index({ readPermissions: 1 });
documentSchema.index({ editPermissions: 1 });

export const Document = mongoose.model<IDocument>('Document', documentSchema); 