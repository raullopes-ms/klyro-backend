# Klyro Backend

API de um cofre pessoal de credenciais. O Klyro centraliza logins de serviços
por usuário, protege as senhas armazenadas com criptografia autenticada e
aplica isolamento de acesso em todas as operações individuais do cofre.

O projeto está em desenvolvimento. A base atual cobre o ciclo completo de
autenticação com access token, refresh token rotacionável e logout, além de
perfil, inativação de conta e criação, listagem, revelação e exclusão de
credenciais. Ainda não deve ser considerada pronta para produção sem os
ajustes descritos em [Limitações e próximos passos](#limitações-e-próximos-passos).

## Problema e funcionalidades atuais

O Klyro evita que credenciais de diferentes serviços sejam mantidas em texto
puro ou misturadas entre usuários. Atualmente, a API permite:

- cadastrar e autenticar usuários;
- renovar sessões com rotação de refresh token e revogar sessões no logout;
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
| Autenticação | `@fastify/jwt` e `@fastify/cookie` |
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
    Client[Cliente HTTP] --> Routes[Rotas, JWT e cookies]
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

- `toPublicUser` nunca copia `passwordHash`;
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
│   └── schema.prisma             # Modelos User e Vault
├── src/
│   ├── env/                      # Validação das variáveis de ambiente
│   ├── http/
│   │   ├── controllers/          # Controllers e registro de rotas
│   │   └── middlewares/          # Verificação JWT
│   ├── lib/                      # Cliente Prisma e criptografia
│   ├── repositories/
│   │   ├── in-memory/            # Implementações para testes
│   │   └── prisma/               # Implementações PostgreSQL/Prisma
│   ├── types/                    # Extensões de tipos do Fastify JWT
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

- senhas de usuários são persistidas como hashes bcrypt;
- access JWTs usam o ID do usuário no claim `sub`, possuem
  `tokenType: "access"` e expiram em 10 minutos;
- refresh JWTs possuem `tokenType: "refresh"`, `jti`, `sessionId`, expiram em 7
  dias e usam um segredo diferente;
- rotas privadas exigem `Authorization: Bearer <token>`;
- contas inativas não conseguem realizar novos logins;
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
- `passwordHash` e `passwordEncrypted` nunca fazem parte dos DTOs públicos.

Refresh tokens são armazenados somente como hash SHA-256. Cada login cria uma
sessão, cada refresh rotaciona o token em transação e a reutilização de um token
substituído revoga toda a família. O token bruto fica apenas em cookie
`HttpOnly`, `SameSite=Strict`, limitado a `/token`; `Secure` é habilitado em
produção. Consulte [docs/refresh-tokens.md](docs/refresh-tokens.md).

O logout é idempotente: remove o cookie mesmo quando o refresh token está
ausente ou inválido. Quando o token é válido, a sessão correspondente é
revogada no banco.

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
JWT_SECRET="access-token-secret-change-me-at-least-32-chars"
REFRESH_TOKEN_SECRET="refresh-token-secret-change-me-at-least-32-chars"
ENCRYPTION_KEY="chave-de-32-bytes-em-base64"
```

| Variável | Descrição |
| --- | --- |
| `NODE_ENV` | Um de `dev`, `test` ou `production` |
| `PORT` | Porta HTTP; o padrão validado é `3333` |
| `DATABASE_URL` | URL de conexão PostgreSQL, incluindo schema quando necessário |
| `JWT_SECRET` | Segredo de pelo menos 32 caracteres para access tokens |
| `REFRESH_TOKEN_SECRET` | Segredo distinto, de pelo menos 32 caracteres, para refresh tokens |
| `ENCRYPTION_KEY` | Exatamente 32 bytes codificados em base64 |

Gere uma chave de criptografia localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Não reutilize os placeholders acima. Não versione `.env`. Trocar
`ENCRYPTION_KEY` sem migrar os dados torna as credenciais existentes
indecifráveis.

## PostgreSQL e Prisma

O schema define quatro entidades:

- `User`: perfil, e-mail único, hash da senha e estado ativo;
- `Vault`: metadados da credencial, senha criptografada e relação com `User`.
- `RefreshSession`: família de refresh tokens de um login;
- `RefreshToken`: `jti`, hash, expiração e estado de rotação/revogação.

Comandos usuais:

```bash
# Gerar o cliente depois de alterar o schema
npx prisma generate

# Criar/aplicar migration no ambiente de desenvolvimento
npx prisma migrate dev

# Aplicar migrations existentes em um ambiente implantado
npx prisma migrate deploy
```

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

Não há prefixo de versão. Em desenvolvimento, assumindo a porta padrão, a base
é `http://localhost:3333`.

Rotas privadas exigem:

```http
Authorization: Bearer <token-jwt>
Content-Type: application/json
```

### Resumo

| Método | Rota | JWT | Sucesso | Objetivo |
| --- | --- | :---: | ---: | --- |
| `POST` | `/register` | Não | `201` | Cadastrar usuário |
| `POST` | `/authenticate` | Não | `200` | Obter JWT |
| `PATCH` | `/token/refresh` | Cookie | `200` | Rotacionar refresh e access tokens |
| `DELETE` | `/token/logout` | Cookie | `204` | Revogar sessão e remover cookie |
| `GET` | `/me` | Sim | `200` | Consultar perfil |
| `PATCH` | `/users/:id/inactivate` | Sim | `200` | Inativar a própria conta |
| `POST` | `/create-credential` | Sim | `201` | Criar credencial criptografada |
| `GET` | `/credentials` | Sim | `200` | Listar metadados das credenciais |
| `GET` | `/credentials/:id` | Sim | `200` | Revelar uma credencial própria |
| `DELETE` | `/credentials/:id` | Sim | `204` | Excluir uma credencial própria |

### Cadastro

```http
POST /register
```

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "uma-senha-segura"
}
```

Sucesso: `201` sem corpo. E-mail duplicado retorna `409`.

### Autenticação

```http
POST /authenticate
```

```json
{
  "email": "ada@example.com",
  "password": "uma-senha-segura"
}
```

O contrato atual retorna o token como string JSON:

```json
"<token-jwt>"
```

O refresh token não aparece no corpo. Ele é enviado em cookie HTTP-only com
escopo `/token`.

Credenciais inválidas retornam `401`. Uma conta inativa com senha válida
retorna `403` com `Usuário inativado`.

Fluxo recomendado para clientes:

1. enviar as credenciais para `/authenticate`;
2. guardar o access token somente em memória e enviá-lo como Bearer token;
3. deixar o cookie HTTP-only ser gerenciado pelo cliente HTTP;
4. chamar `/token/refresh` quando o access token expirar;
5. chamar `/token/logout` ao encerrar a sessão.

O access token não é enviado em cookie e não deve ser persistido em
`localStorage` quando houver uma alternativa mais segura.

### Renovação de tokens

```http
PATCH /token/refresh
Cookie: refreshToken=<refresh-token>
```

Resposta `200`:

```json
{
  "token": "<novo-access-token>"
}
```

O refresh token é rotacionado no cookie. Token ausente, inválido, expirado,
revogado, reutilizado, de finalidade errada ou associado a usuário inativo
retorna o mesmo `401 Unauthorized`. Um replay revoga toda a sessão.

### Logout

```http
DELETE /token/logout
Cookie: refreshToken=<refresh-token>
```

Sempre retorna `204 No Content` e remove o cookie. Quando o token é válido, a
sessão inteira é revogada. A operação é idempotente.

### Perfil autenticado

```http
GET /me
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

`passwordHash` não é retornado.

### Inativação da conta

```http
PATCH /users/user_id/inactivate
```

O ID da rota deve ser o mesmo usuário indicado pelo JWT. A resposta contém o
DTO público do usuário com `isActive: false`. Novas autenticações ficam
bloqueadas.

### Criação de credencial

```http
POST /create-credential
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
GET /credentials
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
GET /credentials/credential_id
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
DELETE /credentials/credential_id
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

A suíte atual contém 54 testes em 11 arquivos. Ela cobre casos de uso,
criptografia, ownership, conta inativa, DTOs públicos, sessões de refresh,
rotação/replay, cookies, fronteiras HTTP e operações de credencial.

```bash
npm test
npx tsc --noEmit
```

Os casos de uso usam repositórios em memória e as fronteiras de autenticação
possuem testes HTTP com `app.inject`. Ainda não existem testes de integração com
PostgreSQL ou testes end-to-end; portanto, o número acima não representa
cobertura total do sistema.

## Documentação adicional

- [Erros da aplicação](docs/errors.md)
- [Mapeadores públicos e segurança de serialização](docs/mappers.md)
- [Refresh tokens, rotação e replay](docs/refresh-tokens.md)

## Limitações e próximos passos

- corrigir o pipeline de build/start e a resolução dos aliases no artefato;
- invalidar access tokens já emitidos antes do limite atual de 10 minutos;
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
