import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    // Espelha os paths do tsconfig.json ("@/*" -> src, prisma, generated)
    alias: [
      { find: /^@\/prisma\/(.*)$/, replacement: `${root}generated/prisma/$1` },
      { find: /^@\/(.*)$/, replacement: `${root}src/$1` },
    ],
  },
});
