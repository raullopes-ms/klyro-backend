import type { FastifyReply, FastifyRequest } from 'fastify'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    if (typeof request.user.sub !== 'string') {
      return reply.status(401).send({ message: 'Unauthorized.' })
    }
  } catch (err) {
    return reply.status(401).send({ message: 'Unauthorized.' })
  }
}