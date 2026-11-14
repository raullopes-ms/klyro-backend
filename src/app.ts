import fastify from "fastify";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { ZodError, z } from "zod";
import { env } from "./env";
import { AppError } from "./use-cases/errors/app-error";
import { usersRoutes } from "./http/controllers/users/routes";
import { vaultsRoutes } from "./http/controllers/vaults/routes";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";

export const app = fastify();
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    const url = new URL(request.url, env.BETTER_AUTH_URL);
    const headers = fromNodeHeaders(request.headers);
    const authRequest = new Request(url, {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });
    const response = await auth.handler(authRequest);
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body ? await response.text() : null);
  },
});
app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",

  errorResponseBuilder: (_, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: "Limite de requisições excedido. Tente novamente mais tarde.",
    retryAfter: context.after,
  }),
});
app.register(usersRoutes, { prefix: "/api" });
app.register(vaultsRoutes, { prefix: "/api" });
app.setErrorHandler((error, request, reply) => {
  if (env.NODE_ENV !== "production") {
    request.log.error(error);
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Erro de validação",
      issues: z.treeifyError(error),
    });
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      message: error.message,
    });
  }
  return reply.status(500).send({
    statusCode: 500,
    error: "Internal Server Error",
    message:
      "Não foi possível processar a solicitação. Tente novamente mais tarde.",
  });
});
