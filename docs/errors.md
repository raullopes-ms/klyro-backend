# Erros da aplicação

As exceções de negócio da aplicação estendem `AppError` e possuem:

- `message`: mensagem destinada ao consumidor da API.
- `statusCode`: código HTTP que deve ser retornado pela API.

O handler global do Fastify usa `statusCode` para definir o status da resposta.

## Classes disponíveis

| Classe | Status HTTP | Quando usar | Mensagem padrão |
| --- | ---: | --- | --- |
| `AppError` | 400 | Erros de regra de negócio sem uma categoria mais específica. É possível informar uma mensagem e, opcionalmente, outro status. | Definida na criação |
| `InvalidCredentialsError` | 401 | Credenciais inválidas durante a autenticação. | `Credenciais inválidas` |
| `InactiveUserError` | 403 | Tentativa de autenticação com uma conta inativada. | `Usuário inativado` |
| `UnauthorizedError` | 401 | Usuário não autorizado a executar uma operação ou acessar um recurso. | `Não autorizado` |
| `ResourceNotFoundError` | 404 | Recurso solicitado não encontrado. | `Recurso não encontrado.` |
| `UsersAlreadyExistsError` | 409 | Tentativa de criar um usuário com e-mail já cadastrado. | `Usuário já existe` |

## Como usar

```ts
throw new ResourceNotFoundError();
```

Uma exceção de negócio genérica pode informar um status específico:

```ts
throw new AppError("You can only inactivate your own user", 400);
```

As respostas de erro de negócio seguem este formato:

```json
{
  "statusCode": 404,
  "message": "Recurso não encontrado."
}
```

Erros de validação do Zod retornam `400` com `message: "Erro de validação"` e
`issues`.
Erros inesperados continuam retornando `500` sem expor detalhes internos.
