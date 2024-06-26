
import fp from 'fastify-plugin';
const config = require(process.env.config_location ?? '../../config.json')
export default fp(async (fastify) => {
    fastify.decorate('rateLimits', { max: config.apiRateLimits, counts: { ipstack: {}, ipapi: {} } })
    fastify.decorate('incrementCounter', (name: keyof RateCounter, hour: string) => {
        if (fastify.rateLimits.counts[name][hour]) {
            fastify.rateLimits.counts[name][hour] = fastify.rateLimits.counts[name][hour] + 1
        } else {
            fastify.rateLimits.counts[name] = { [hour]: 1 }
        }
    })
})

export interface RateCounter {
    ipapi: {
        [hour: string]: number
    }
    ipstack: {
        [hour: string]: number
    }
}
declare module 'fastify' {
    interface FastifyInstance {
        rateLimits: {
            max: {
                ipapi: number
                ipstack: number
            }
            counts: RateCounter
        }
        incrementCounter(name: keyof RateCounter, hour: string): void
    }
}