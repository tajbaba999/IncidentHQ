import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { isSelfHosted } from '@/lib/config'

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL!
    // Neon's serverless driver speaks Neon's proxy protocol, not plain TCP —
    // self-hosted (and any non-Neon database, e.g. local Docker Postgres)
    // needs the standard pg driver.
    const useNeon = !isSelfHosted() && connectionString?.includes('neon.tech')
    const adapter = useNeon
        ? new PrismaNeon({ connectionString })
        : new PrismaPg({ connectionString })
    return new PrismaClient({ adapter })
}

declare global {
    // eslint-disable-next-line no-var
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
