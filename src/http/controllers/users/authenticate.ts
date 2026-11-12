import { InvalidCredentialsError } from "@/use-cases/errors/invalid-credentials-error";
import { setRefreshTokenCookie } from "@/http/cookies/refresh-token-cookie";
import { makeLoginUseCase } from "@/use-cases/factories/make-login-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authenticateBodySchema = z.object({
    email: z.email(),
    password: z.string().min(8),
  });
  const { email, password } = authenticateBodySchema.parse(request.body);
  try {
    const loginUseCase = makeLoginUseCase(request.server);
    const { accessToken, refreshToken } = await loginUseCase.execute({
      email,
      password,
    });
    setRefreshTokenCookie(reply, refreshToken);
    return reply.status(200).send(accessToken);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}
