# Klyro Backend

API de um cofre pessoal de credenciais. O Klyro centraliza logins de serviços
por usuário, protege as senhas armazenadas com criptografia autenticada e
aplica isolamento de acesso em todas as operações individuais do cofre.

O projeto está em desenvolvimento. A base atual cobre o ciclo de autenticação
com sessões gerenciadas pelo Better Auth, perfil, inativação de conta e
criação, listagem, revelação e exclusão de credenciais. Ainda não deve ser
considerada pronta para produção sem os ajustes descritos em
[Limitações e próximos passos](#limitações-e-próximos-passos).

## Problema e funcionalidades atuais

O Klyro evita que credenciais de diferentes serviços sejam mantidas em texto
puro ou misturadas entre usuários. Atualmente, a API permite:

- cadastrar e autenticar usuários;
- criar, consultar e encerrar sessões pelo Better Auth;
- consultar o perfil autenticado;
- inativar a própria conta;
- impedir novos logins de contas inativas;
- criar credenciais com a senha criptografada no banco;
- listar somente os metadados públicos das próprias credenciais;
- revelar a senha de uma credencial específica, após validar o proprietário;
- excluir uma credencial do proprietário de forma atômica;
- limitar requisições globalmente e padronizar erros de validação e negócio;
- executar regras de negócio com repositórios Prisma em produção e repositórios
  em memória nos testes.

## Stack

| Área | Tecnologia |
| --- | --- |
| Runtime | Node.js, TypeScript e ES Modules |
| HTTP | Fastify 5 |
| Validação | Zod 4 |
| Autenticação | Better Auth, sessões HTTP-only e adapter Prisma |
| Rate limiting | `@fastify/rate-limit` |
| Persistência | PostgreSQL, Prisma 7 e adapter `pg` |
| Hash de senha | `bcryptjs` |
| Criptografia do cofre | AES-256-GCM com `node:crypto` |
| Testes | Vitest 5 e repositórios em memória |
| Desenvolvimento | `tsx watch` |

## Arquitetura

O código segue uma separação em camadas. Controllers cuidam do protocolo HTTP,
casos de uso concentram regras de negócio, contratos de repositório isolam a
persistência e factories fazem a composição das implementações concretas.

```mermaid
flowchart LR
    Client[Cliente HTTP] --> BetterAuth[Better Auth e sessões]
    BetterAuth --> Routes[Rotas protegidas]
    Routes --> Controllers[Controllers e validação Zod]
    Controllers --> Factories[Factories]
    Factories --> UseCases[Casos de uso]
    UseCases --> Contracts[Contratos de repositório]
    Contracts --> PrismaRepo[Repositórios Prisma]
    PrismaRepo --> PostgreSQL[(PostgreSQL)]
    UseCases --> Mappers[DTOs e mapeadores públicos]
    UseCases --> Crypto[Criptografia AES-256-GCM]
    MemoryRepo[Repositórios em memória] -. testes .-> Contracts
```

Fluxo típico:

1. uma rota aplica autenticação quando necessário;
2. o controller valida entrada com Zod;
3. a factory instancia o caso de uso com seus repositórios;
4. o caso de uso executa regras e acessa contratos, não o Prisma diretamente;
5. um mapper constrói a resposta pública em runtime;
6. o controller define status e corpo HTTP.

## SOLID e decisões de design

O projeto não reivindica aplicar integralmente os cinco princípios SOLID, mas
há aplicações concretas dos seguintes princípios:

### Responsabilidade única (SRP)

- controllers tratam HTTP, parâmetros e respostas;
- casos de uso tratam regras da aplicação;
- repositórios tratam persistência;
- `src/lib/crypto.ts` concentra criptografia e validação de payloads;
- mapeadores definem quais campos podem sair da aplicação;
- factories concentram a composição das dependências.

### Inversão de dependências (DIP)

Os casos de uso recebem `UsersRepository` e `VaultsRepository` pelos
construtores. Eles não instanciam Prisma nem dependem da conexão PostgreSQL.
Factories escolhem as implementações Prisma em runtime, enquanto os testes
injetam implementações em memória.

### Contratos e substituição de implementações

As interfaces de repositório definem as operações disponíveis. As versões
Prisma e in-memory respeitam os mesmos contratos, o que permite testar regras de
negócio sem banco real. Os contratos ainda usam alguns tipos de entrada gerados
pelo Prisma; reduzir esse acoplamento é uma evolução possível.

### Repository Pattern

- `PrismaUsersRepository` e `PrismaVaultsRepository` acessam o banco;
- `InMemoryUsersRepository` e `InMemoryVaultsRepository` sustentam os testes;
- consultas sensíveis incluem ownership no próprio repositório;
- a exclusão usa `deleteMany({ where: { id, userId } })`, evitando uma janela
  entre verificar o proprietário e apagar o registro.

### Factories e composição

Cada factory cria os repositórios concretos e os injeta no caso de uso
correspondente. Não há container de injeção de dependências; a composição é
explícita e localizada em `src/use-cases/factories`.

### DTOs e mapeadores públicos

Entidades Prisma não são serializadas diretamente. Os mapeadores usam uma
allowlist para construir novos objetos em runtime:

- `toPublicUser` retorna somente os campos públicos do usuário;
- `toPublicCredential` nunca copia `passwordEncrypted`;
- `toRevealedCredential` retorna somente `id` e `password` após autorização e
  descriptografia.

Apenas omitir um campo em um tipo TypeScript não altera o objeto em runtime.
Por isso, essa fronteira é implementada com objetos novos e protegida por
testes. Consulte [docs/mappers.md](docs/mappers.md).

## Estrutura do projeto

```text
.
├── docs/                         # Documentação de erros e mapeadores
├── generated/prisma/             # Cliente Prisma gerado (ignorado pelo Git)
├── prisma/
│   ├── migrations/               # Histórico de migrations SQL
│   └── schema.prisma             # Modelos do domínio e do Better Auth
├── scripts/                      # Scripts operacionais, incluindo migração de contas
├── src/
│   ├── env/                      # Validação das variáveis de ambiente
│   ├── http/
│   │   ├── controllers/          # Controllers e registro de rotas
│   │   └── middlewares/          # Verificação de sessão
│   ├── lib/                      # Cliente Prisma e criptografia
│   ├── repositories/
│   │   ├── in-memory/            # Implementações para testes
│   │   └── prisma/               # Implementações PostgreSQL/Prisma
│   ├── types/                    # Tipos da sessão autenticada
│   └── use-cases/
│       ├── errors/               # Erros de negócio
│       ├── factories/            # Composição de dependências
│       ├── mappers/              # DTOs públicos em runtime
│       ├── tests/                # Testes unitários
│       ├── users/                # Casos de uso de usuários
│       └── vaults/               # Casos de uso do cofre
├── src/app.ts                    # Plugins, rotas e handler global
├── src/server.ts                 # Inicialização do servidor
├── prisma7.config.ts             # Configuração do Prisma 7
└── vite.config.ts                # Aliases usados pelo Vitest/Vite
```

## Segurança

### Autenticação e contas

- o Better Auth persiste usuários, contas, sessões e verificações no PostgreSQL;
- login por e-mail e senha é exposto pelo handler `/api/auth/*`;
- hashes de senha usam bcrypt para manter compatibilidade com as contas atuais;
- sessões são transportadas por cookies HTTP-only gerenciados pelo Better Auth;
- sessões expiram por padrão após 7 dias e são atualizadas quando utilizadas;
- rotas privadas consultam a sessão com `auth.api.getSession`;
- contas inativas não devem iniciar novas sessões;
- o rate limit global atual é de 100 requisições por minuto.

### Criptografia do cofre

As senhas das credenciais usam AES-256-GCM com:

- chave de 32 bytes fornecida por `ENCRYPTION_KEY`;
- IV aleatório de 12 bytes por operação;
- tag de autenticação para detectar adulteração;
- payload versionado no formato `v1:<iv>:<authTag>:<cipherText>`.

A senha só é descriptografada depois que a consulta confirma simultaneamente
o ID da credencial e o proprietário. Uma falha criptográfica interrompe a
operação, sem devolver dados parciais ou o ciphertext.

> A rota de revelação entrega a senha em texto claro ao cliente autorizado.
> Uma implantação real deve obrigatoriamente usar HTTPS e proteger logs,
> proxies e clientes contra captura desse conteúdo.

### Ownership e não enumeração

- listagens sempre filtram por `userId`;
- visualização usa `findByIdAndUserId`;
- exclusão filtra atomicamente por `id + userId`;
- ID inexistente e credencial de outro usuário retornam o mesmo erro `404`;
- a resposta de revelação inclui `Cache-Control: no-store`;
- credenciais de autenticação e `passwordEncrypted` nunca fazem parte dos DTOs
  públicos.

O fluxo ativo usa as tabelas `Session` e `Account` do Better Auth. As tabelas
antigas de refresh foram removidas do banco e não fazem mais parte do schema.

## Requisitos

- Node.js e npm. O repositório ainda não fixa uma versão em `engines`; use uma
  versão atual compatível com ES2023 e com as dependências do projeto.
- PostgreSQL acessível pela aplicação.
- Uma chave AES-256 em base64 para o cofre.

Docker, Docker Compose e provisionamento automático do PostgreSQL não estão
incluídos no repositório.

## Instalação e execução local

```bash
git clone https://github.com/raullopes-ms/klyro-backend.git
cd klyro-backend
npm install
```

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Preencha as variáveis, prepare o banco e gere o cliente:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Por padrão, o servidor usa a porta configurada em `PORT` e escuta em
`0.0.0.0`.

## Variáveis de ambiente

As chaves aceitas são definidas em `.env.example` e validadas na inicialização.

```dotenv
NODE_ENV=dev
PORT=3333
DATABASE_URL="postgresql://user:password@localhost:5432/klyro?schema=public"
BETTER_AUTH_URL="http://localhost:3333"
BETTER_AUTH_SECRET="better-auth-secret-change-me-at-least-32-chars"
ENCRYPTION_KEY="chave-de-32-bytes-em-base64"
```

| Variável | Descrição |
| --- | --- |
| `NODE_ENV` | Um de `dev`, `test` ou `production` |
| `PORT` | Porta HTTP; o padrão validado é `3333` |
| `DATABASE_URL` | URL de conexão PostgreSQL, incluindo schema quando necessário |
| `BETTER_AUTH_URL` | URL base confiável para o Better Auth |
| `BETTER_AUTH_SECRET` | Segredo de pelo menos 32 caracteres para sessões |
| `ENCRYPTION_KEY` | Exatamente 32 bytes codificados em base64 |

Gere uma chave de criptografia localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Não reutilize os placeholders acima. Não versione `.env`. Trocar
`ENCRYPTION_KEY` sem migrar os dados torna as credenciais existentes
indecifráveis.

## PostgreSQL e Prisma

O schema define as entidades do domínio e do Better Auth:

- `User`: perfil, e-mail, estado ativo e relações de autenticação;
- `Vault`: metadados da credencial, senha criptografada e relação com `User`;
- `Session`: sessões ativas e seus cookies;
- `Account`: credenciais de e-mail/senha e futuras contas OAuth;
- `Verification`: tokens de verificação do Better Auth;

Comandos usuais:

```bash
# Gerar o cliente depois de alterar o schema
npx prisma generate

# Criar/aplicar migration no ambiente de desenvolvimento
npx prisma migrate dev

# Aplicar migrations existentes em um ambiente implantado
npx prisma migrate deploy
```

A migration `add_better_auth` cria as tabelas necessárias para o Better Auth.
Em desenvolvimento, aplique as migrations pendentes com:

```bash
npx prisma migrate dev
npx prisma generate
```

As contas existentes precisavam ser migradas para `Account` com
`providerId: "credential"` antes da remoção do campo legado. Depois que essa
migração for concluída, novos cadastros e alterações de senha são gerenciados
diretamente pelo Better Auth.

A URL do datasource é lida de `DATABASE_URL` por `prisma7.config.ts`.

## Scripts e validações

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Executa `src/server.ts` com reload automático |
| `npm test` | Executa a suíte Vitest uma vez |
| `npx tsc --noEmit` | Verifica tipos sem gerar arquivos |
| `npm run build` | Executa `tsc` conforme o `tsconfig.json` atual |
| `npm start` | Tenta iniciar `dist/server.js` |

> O pipeline de produção ainda precisa ser corrigido: `npm start` espera
> `dist/server.js`, mas `rootDir` e `outDir` não estão ativos no `tsconfig.json`.
> Além disso, os aliases `@/` precisam ser resolvidos no artefato final. Use
> `npm run dev` para desenvolvimento até que build e start sejam alinhados.

## API

Todas as rotas da API usam o prefixo `/api`. Em desenvolvimento, assumindo a
porta padrão, a base é `http://localhost:3333/api`.

Rotas privadas exigem o cookie de sessão HTTP-only emitido pelo Better Auth:

```http
Cookie: better-auth.session_token=<session-token>
Content-Type: application/json
```

### Resumo

| Método | Rota | Sessão | Sucesso | Objetivo |
| --- | --- | :---: | ---: | --- |
| `POST` | `/api/auth/sign-up/email` | Não | `200` | Cadastrar usuário |
| `POST` | `/api/auth/sign-in/email` | Não | `200` | Criar sessão |
| `POST` | `/api/auth/sign-out` | Sim | `200` | Encerrar sessão |
| `GET` | `/api/auth/get-session` | Sim | `200` | Consultar sessão Better Auth |
| `GET` | `/api/me` | Sim | `200` | Consultar perfil |
| `PATCH` | `/api/users/:id/inactivate` | Sim | `200` | Inativar a própria conta |
| `POST` | `/api/create-credential` | Sim | `201` | Criar credencial criptografada |
| `GET` | `/api/credentials` | Sim | `200` | Listar metadados das credenciais |
| `GET` | `/api/credentials/:id` | Sim | `200` | Revelar uma credencial própria |
| `DELETE` | `/api/credentials/:id` | Sim | `204` | Excluir uma credencial própria |

### Cadastro e login

```http
POST /api/auth/sign-up/email
```

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "uma-senha-segura"
}
```

O Better Auth cria a sessão e envia o cookie HTTP-only na resposta. Para
autenticar:

```http
POST /api/auth/sign-in/email
```

```json
{
  "email": "ada@example.com",
  "password": "uma-senha-segura"
}
```

Fluxo recomendado para clientes:

1. enviar o cadastro ou login para `/api/auth/*`;
2. preservar cookies entre requisições (`credentials: "include"` no browser);
3. usar as rotas privadas com o cookie de sessão;
4. chamar `/api/auth/sign-out` ao encerrar a sessão.

Credenciais inválidas retornam erro do Better Auth. Uma conta inativa não deve
criar novas sessões.

As requisições para `/api/auth/*` precisam incluir um header `Origin` igual a
uma origem confiável configurada em `BETTER_AUTH_URL`. Clientes React Native
devem usar um cookie jar para persistir o cookie HTTP-only; suporte a
`Authorization: Bearer` não está habilitado nesta configuração.

### Perfil autenticado

```http
GET /api/me
```

```json
{
  "user": {
    "id": "user_id",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "isActive": true,
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

Credenciais da conta não são retornadas.

### Inativação da conta

```http
PATCH /api/users/user_id/inactivate
```

O ID da rota deve ser o mesmo usuário indicado pela sessão. A resposta contém o
DTO público do usuário com `isActive: false`. Novas autenticações ficam
bloqueadas.

### Criação de credencial

```http
POST /api/create-credential
```

```json
{
  "serviceName": "GitHub",
  "username": "ada",
  "password": "senha-do-servico",
  "serviceUrl": "https://github.com",
  "notes": "Conta pessoal",
  "favorite": true
}
```

Resposta `201`:

```json
{
  "message": "Credential created successfully"
}
```

A senha é criptografada antes da persistência.

### Listagem de credenciais

```http
GET /api/credentials
```

```json
{
  "credentials": [
    {
      "id": "credential_id",
      "serviceName": "GitHub",
      "username": "ada",
      "serviceUrl": "https://github.com",
      "notes": "Conta pessoal",
      "favorite": true,
      "userId": "user_id",
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

Nem a senha em texto claro nem `passwordEncrypted` são incluídos.

### Revelação de credencial

```http
GET /api/credentials/credential_id
```

```json
{
  "credential": {
    "id": "credential_id",
    "password": "senha-do-servico"
  }
}
```

Somente o proprietário recebe a resposta. O endpoint envia
`Cache-Control: no-store`. `passwordEncrypted` nunca é serializado.

### Exclusão de credencial

```http
DELETE /api/credentials/credential_id
```

Sucesso: `204 No Content`. A operação não retorna a credencial nem qualquer
campo sensível. ID inexistente e credencial pertencente a outra pessoa retornam
o mesmo `404`.

## Tratamento de erros

O handler global diferencia:

- erros Zod: `400`, com `message` e árvore de `issues`;
- subclasses de `AppError`: status e mensagem definidos pelo erro de negócio;
- erros inesperados: `500`, sem detalhes internos;
- rate limit excedido: `429`, com indicação de nova tentativa.

Formato de erro de negócio:

```json
{
  "statusCode": 404,
  "message": "Resource not found."
}
```

A lista de erros está em [docs/errors.md](docs/errors.md).

## Testes

A suíte atual contém 41 testes em 9 arquivos. Ela cobre casos de uso,
criptografia, ownership, conta inativa, DTOs públicos e operações de
credencial. A integração HTTP do Better Auth ainda precisa de testes
específicos.

```bash
npm test
npx tsc --noEmit
```

Os casos de uso usam repositórios em memória. Ainda não existem testes
específicos do handler Better Auth, testes de integração com PostgreSQL ou
testes end-to-end; portanto, o número acima não representa cobertura total do
sistema.

## Documentação adicional

- [Erros da aplicação](docs/errors.md)
- [Mapeadores públicos e segurança de serialização](docs/mappers.md)
- [Configuração do Better Auth](https://better-auth.com/docs/integrations/fastify)

## Limitações e próximos passos

- corrigir o pipeline de build/start e a resolução dos aliases no artefato;
- adicionar gerenciamento de sessões por dispositivo e limpeza de registros
  expirados;
- revisar o custo do bcrypt e a política de senhas;
- implementar rotação segura de `ENCRYPTION_KEY` e migração de ciphertexts;
- adicionar paginação à listagem e índice para consultas por `Vault.userId`;
- adicionar atualização de credenciais;
- normalizar e-mails e tratar concorrência de cadastro na constraint única;
- adicionar OpenAPI, versionamento e contratos de resposta do Fastify;
- adicionar testes HTTP, de integração e end-to-end;
- adicionar health checks, logging estruturado e observabilidade;
- preparar configuração de deploy e rate limit compartilhado para múltiplas
  instâncias.
