# Docs Web - Backend

Backend do editor de documentos colaborativo em tempo real, construído com Node.js, TypeScript, Socket.IO e MongoDB.

## 🚀 Tecnologias

- **Node.js** com TypeScript
- **Express.js** para API REST
- **Socket.IO** para WebSockets em tempo real
- **MongoDB Atlas com Mongoose** para banco de dados na nuvem
- **JWT** para autenticação segura
- **bcrypt** para criptografia de senhas

## 📁 Estrutura

```
src/
├── db/                  # Controladores Typescript
│   ├── adminController.ts
│   ├── authController.ts
│   └── documentoController.ts
├── db/                  # Conexão com banco de dados
│   └── dbConnect.ts
├── events/              # Eventos Socket.IO
│   ├── loginEvents.ts
│   ├── documentEvents.ts
│   ├── passwordRecoveryEvents.ts
│   └── profileEvents.ts
├── middlewares/         # Middlewares Express
│   ├── requireAuth.ts
│   ├── verificarPermissoes.ts
│   └── autorizarUsuario.ts
├── models/              # Modelos Mongoose
│   ├── User.ts
│   ├── Document.ts
│   └── PasswordReset.ts
├── routes/               # Rotas TypeScript
│   ├── adminRoutes.ts
│   ├── authRoutes.ts
│   ├── documentRoutes.ts
│   └── userRoutes.ts
├── types/               # Tipos TypeScript
│   ├── express.d.ts
│   └── index.ts
├── utils/               # Utilitários
│   ├── sessoesAtivas.ts
│   ├── email.ts
│   └── imageValidation.ts
└── server.ts
```

## 🛠️ Instalação

```bash
npm install
```

## 🚀 Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3333` , é possível alterar configurando o .env

## 📦 Build

```bash
npm run build
```

## 🚀 Produção

```bash
npm start
```

## 🔧 Scripts

- `npm run dev` - Executa em modo desenvolvimento com hot reload
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Executa em produção

## 🌐 Variáveis de Ambiente

Configure o arquivo `config.env`:

```env
# Configurações do MongoDB Atlas
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/?retryWrites=true&w=majority

# Configurações do JWT
JWT_SECRET=Seu token

# Configurações do servidor
PORT=3333
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## 🔐 Autenticação

O backend gerencia autenticação através de:
- **JWT Tokens** com expiração
- **Sessões únicas** para prevenir login duplicado
- **Criptografia bcrypt** para senhas
- **Tokens de recuperação** para reset de senha

## 🔄 WebSockets

### Namespaces
- `/` - Namespace público para login/registro
- `/usuarios` - Namespace autenticado para documentos

### Eventos Principais

#### Autenticação
- `autenticar_usuario` - Login
- `registrar_usuario` - Registro
- `recuperar_senha` - Recuperação de senha
- `redefinir_senha` - Redefinição de senha

#### Documentos
- `carregar_documentos` - Listar documentos
- `criar_documento` - Criar novo documento
- `selecionar_documento` - Abrir documento
- `texto_editor` - Sincronizar texto
- `deletar_documento` - Deletar documento

#### Colaboração
- `comecar_digitacao` - Indicar que está digitando
- `parar_digitacao` - Parar indicador de digitação
- `usuarios_online` - Lista de usuários online

## 📊 Banco de Dados

### Modelos

#### User
```typescript
{
  
  name: string;
  email: string;
  password: string;
  empresa: string;
  tipoUsuario: string;
  permissions: object;
  profileImage: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Document
```typescript
{
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  readPermissions: string[];
  editPermissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### PasswordReset
```typescript
{
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}
```

## 🔒 Segurança

- **CORS** configurado para desenvolvimento
- **Validação de entrada** em todos os endpoints
- **Sanitização de dados** para prevenir injeções
- **Tokens únicos** para recuperação de senha

## 🔧 Endpoints de Administração

### Validação de funcionamento
```
GET /ping
```

### Sessões Ativas
```
GET /api/admin/sessions
```

### Status do Email
```
GET /api/admin/email-status
```

### Limpar Sessões
```
POST /api/admin/clear-sessions
```

## 📧 Email Service

O serviço de email suporta múltiplos provedores:

### Configuração
- **SMTP** - Configuração via servidor SMTP
- **Simulação** - Fallback para desenvolvimento

### Variáveis de Ambiente
```env
# Configurações de Email
# Para usar o Gmail, é necessário ativar o acesso a aplicativos menos seguros ou usar uma senha de aplicativo.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha
SMTP_FROM=seu-email@gmail.com
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=seu-email@gmail.com
EMAIL_FROM_NAME=Nome que deseja
```

### Funcionalidades
- **Recuperação de senha** - Email com link seguro
- **Confirmação de alteração** - Notificação de sucesso


## 📝 Logs

O servidor inclui logs detalhados:
- Conexões Socket.IO
- Operações de banco de dados
- Erros e exceções
- Performance

## 🚀 Deploy

### Render
1. Conecte o repositório
2. Configure as variáveis de ambiente
3. Deploy automático

## 📞 Suporte

Para problemas:
1. Verifique os logs do servidor
2. Confirme as variáveis de ambiente
3. Teste a conexão com MongoDB
4. Verifique o CORS 