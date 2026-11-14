import type { FastifyInstance } from "fastify";
import { verifySession } from "@/http/middlewares/verify-session";
import { createCredential } from "./create-credential";
import { listCredentials } from "./list-credentials";
import { getCredential } from "./get-credential";
import { deleteCredential } from "./delete-credential";
import { updateCredential } from "./update-credential";

export async function vaultsRoutes(app: FastifyInstance) {
  app.get("/credentials", { onRequest: [verifySession] }, listCredentials);
  app.get("/credential/:id", { onRequest: [verifySession] }, getCredential);
  app.delete(
    "/credentials/:id",
    { onRequest: [verifySession] },
    deleteCredential,
  );
  app.post("/create-credential", { onRequest: [verifySession] }, createCredential);
  app.patch("/update-credential/:id", { onRequest: [verifySession] }, updateCredential);
}
