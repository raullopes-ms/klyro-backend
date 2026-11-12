# Mapeadores públicos

Os mapeadores públicos definem a fronteira entre as entidades persistidas pelo
Prisma e os objetos que os casos de uso podem entregar à camada HTTP. Eles
existem para impedir que campos internos ou sensíveis sejam serializados por
engano nas respostas da API.

## Por que não retornar entidades Prisma diretamente

As entidades `User` e `Vault` representam todos os campos armazenados no banco.
Isso inclui `passwordHash` no usuário e `passwordEncrypted` na credencial. Ao
retornar uma dessas entidades diretamente, o Fastify serializa também esses
campos, mesmo quando a interface de resposta do caso de uso declara apenas um
subconjunto deles.

Os tipos TypeScript são removidos durante a compilação. Portanto, anotar uma
entidade como um tipo sem `passwordHash` ou `passwordEncrypted` não altera o
objeto em runtime. A remoção precisa ocorrer na construção do valor retornado.

## Mapeadores disponíveis

### `toPublicUser`

O mapeador
[`toPublicUser`](../src/use-cases/mappers/to-public-user.ts) recebe uma entidade
`User` e cria um novo objeto apenas com `id`, `name`, `email`, `isActive`,
`createdAt` e `updatedAt`. O campo `passwordHash` não é copiado e, por isso, não
existe no objeto público em runtime.

Ele é usado nos casos de uso de:

- cadastro de usuário;
- autenticação;
- consulta do perfil, exposta por `GET /me`;
- inativação da conta, exposta por `PATCH /users/:id/inactivate`.

O cadastro não envia o usuário no corpo da resposta e a autenticação envia
somente o token, mas os casos de uso também retornam DTOs seguros para evitar
que uma mudança futura no controller exponha o hash.

### `toPublicCredential`

O mapeador
[`toPublicCredential`](../src/use-cases/mappers/to-public-credential.ts) recebe
uma entidade `Vault` e cria um objeto com os metadados públicos da credencial.
O campo `passwordEncrypted` não é copiado e, portanto, não é retornado por
`GET /credentials`.

### `toRevealedCredential`

O mapeador
[`toRevealedCredential`](../src/use-cases/mappers/to-revealed-credential.ts)
reutiliza `toPublicCredential` e acrescenta somente a senha já descriptografada
no campo `password`. Ele é usado por `GET /credentials/:id`, que revela uma
credencial específica apenas depois de confirmar simultaneamente seu ID e o
proprietário autenticado.

Mesmo nessa visão, `passwordEncrypted` nunca faz parte do objeto público. A
descriptografia ocorre no caso de uso após a validação de propriedade, e uma
falha criptográfica interrompe a resposta sem devolver dados parciais.

## Allowlist de campos

Os mapeadores usam uma allowlist: cada campo público é informado explicitamente
no objeto de saída. Não deve ser usado spread (`...user`, `...vault`) nem a
simples omissão de um campo via tipo, pois essas abordagens podem permitir que
campos novos sejam expostos automaticamente.

Quando um modelo Prisma receber um novo campo:

1. considere o campo privado por padrão;
2. decida explicitamente se ele pode fazer parte da API;
3. atualize o DTO e o mapeador apenas quando a exposição for intencional;
4. ajuste os testes para confirmar o contrato público;
5. revise todos os endpoints que utilizam o mapeador.

## Exemplo de uso

```ts
const user = await usersRepository.findById(userId);

if (!user) {
  throw new ResourceNotFoundError();
}

return { user: toPublicUser(user) };
```

Para coleções, o mesmo princípio é aplicado a cada entidade:

```ts
return { vaults: vaults.map(toPublicCredential) };
```

Uma credencial revelada parte do DTO público já filtrado:

```ts
const password = decrypt(vault.passwordEncrypted);

return {
  credential: toRevealedCredential(vault, password),
};
```

## Responsabilidade dos testes

Os testes dos casos de uso devem verificar o objeto real retornado, não apenas
seu tipo. Em especial, devem manter as asserções de que:

```ts
expect(user).not.toHaveProperty("passwordHash");
expect(credential).not.toHaveProperty("passwordEncrypted");
```

Essas verificações protegem a remoção em runtime e evitam regressões caso uma
entidade Prisma volte a ser retornada diretamente.
