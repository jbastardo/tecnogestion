import { defineConfig } from '@prisma/config'

export default defineConfig({
  migrate: {
    databaseUrl: process.env.DATABASE_URL,
  },
})
