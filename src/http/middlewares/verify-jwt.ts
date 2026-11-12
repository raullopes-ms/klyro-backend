import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AccessTokenClaims } from '@/lib/auth-tokens'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authorization = request.headers.authorization
    const match = authorization?.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return reply.status(401).send({ message: 'Unauthorized.' })
    }

    const token = match[1]?.trim()
    if (!token) {
      return reply.status(401).send({ message: 'Unauthorized.' })
    }

    const claims = request.server.jwt.access.verify<AccessTokenClaims>(token)
    if (
      typeof claims.sub !== 'string' ||
      claims.tokenType !== 'access'
    ) {
      return reply.status(401).send({ message: 'Unauthorized.' })
    }
    request.user = claims
  } catch (err) {
    return reply.status(401).send({ message: 'Unauthorized.' })
  }
}
