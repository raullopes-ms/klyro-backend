import type { FastifyInstance } from "fastify";
import { verifyJwt } from "@/http/middlewares/verify-jwt";
import { createCredential } from "./create-credential";
import { listCredentials } from "./list-credentials";
import { getCredential } from "./get-credential";
import { deleteCredential } from "./delete-credential";

export async function vaultsRoutes(app: FastifyInstance) {
  app.get("/credentials", { onRequest: [verifyJwt] }, listCredentials);
  app.get("/credentials/:id", { onRequest: [verifyJwt] }, getCredential);
  app.delete(
    "/credentials/:id",
    { onRequest: [verifyJwt] },
    deleteCredential,
  );
  app.post("/create-credential", { onRequest: [verifyJwt] }, createCredential);
}
