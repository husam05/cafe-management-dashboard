
import { PrismaClient } from '@prisma/client';

// Create a dummy prisma client that throws helpful errors when DATABASE_URL is not set
const createDummyClient = () => {
    const handler = {
        get: (_: any, prop: string): any => {
            // Return a function that throws for any model access
            return new Proxy({}, {
                get: () => async () => {
                    throw new Error(`DATABASE_URL not configured. Cannot access prisma.${prop}`);
                }
            });
        }
    };
    return new Proxy({} as PrismaClient, handler);
};

const prismaClientSingleton = () => {
    // Only create real client if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL not set - Prisma client is disabled');
        return createDummyClient();
    }
    return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
