import fp from 'fastify-plugin';
export default fp(async (fastify) => {
    fastify.decorate('cache', {})
})

declare module 'fastify' {
    interface FastifyInstance {
        cache: {[ip: string]: string}
    }

}
