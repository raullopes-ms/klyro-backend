# Refresh tokens

O Klyro usa access e refresh tokens com finalidades, segredos e ciclos de vida
separados.

## Tokens

- access token: JWT de 10 minutos, claim `tokenType: "access"`, aceito somente
  pelo header `Authorization: Bearer`;
- refresh token: JWT de 7 dias, claim `tokenType: "refresh"`, `jti` único e
  `sessionId`, aceito somente pelo cookie `refreshToken` em rotas sob `/token`.

`JWT_SECRET` e `REFRESH_TOKEN_SECRET` devem ter pelo menos 32 caracteres, devem
ser diferentes e não devem ser versionados.

## Persistência e rotação

O banco armazena uma `RefreshSession` por família e registros `RefreshToken`
para cada rotação. Somente o hash SHA-256 do refresh token é persistido; o token
bruto existe apenas no cookie HTTP-only do cliente.

Ao renovar:

1. assinatura, expiração e claims são verificadas com o segredo de refresh;
2. o token é localizado por `jti`, sessão, usuário e hash;
3. o estado ativo do usuário é conferido;
4. o token atual é reivindicado e revogado condicionalmente;
5. o próximo token é criado na mesma transação.

A atualização condicional permite apenas uma rotação vencedora. Reutilizar um
token revogado ou substituído é tratado como replay e revoga toda a família.
Qualquer falha esperada retorna o mesmo `401 Unauthorized`.

## Cookie

O cookie usa:

- `HttpOnly`;
- `SameSite=Strict`;
- `Secure` em produção;
- `Path=/token`;
- `Max-Age` de 7 dias.

O login e o refresh substituem o cookie. `DELETE /token/logout` revoga a sessão
quando o token é válido e sempre remove o cookie. O logout é idempotente:
cookie ausente, inválido ou já revogado também resulta em `204 No Content`.

## Limites do modelo atual

- access tokens já emitidos permanecem válidos até o limite de 10 minutos;
- não há interface de gerenciamento de sessões por dispositivo;
- registros expirados ainda precisam de uma rotina periódica de limpeza.
