import { createClient } from 'redis';

export const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
});

async function connectRedis() {
    try {
        console.log('REDIS', process.env.REDIS_PASSWORD, process.env.REDIS_HOST, process.env.REDIS_PORT);
        await redisClient.connect();
    } catch (error) {
        console.error(error);
    }
}

connectRedis();