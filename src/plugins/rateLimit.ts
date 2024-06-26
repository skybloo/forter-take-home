
import fp from 'fastify-plugin';
import config from '../../config.json';
export default fp(async (fastify) => {
    fastify.decorate('rateLimits', { max: config.apiRateLimits, counts: { ipstack: {}, ipapi: {} } })
})

declare module 'fastify' {
    interface FastifyInstance {
        rateLimits: {
            max: {
                ipapi: number
                ipstack: number
            }
            counts: {
                ipapi: {
                    [hour: string]: number
                }
                ipstack: {
                    [hour: string]: number
                }
            }
        }
    }
}