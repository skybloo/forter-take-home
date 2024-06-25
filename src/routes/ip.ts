import { FastifyPluginAsync, RequestGenericInterface } from "fastify";

const routes: FastifyPluginAsync = async (fastify, opts) => {
    interface RequestGet extends RequestGenericInterface {
        Querystring: {
            ip: string
        }
    }
    fastify.get<RequestGet>('/ip', opts, async (request, reply) => {
        const ip = request.query.ip
        const country = await getCountry(ip)
        return {country}

    })
    interface RequestPost extends RequestGenericInterface {
        Body: {
            ip: string
        }
    }

    fastify.post<RequestPost>('/ip', opts, async (request, reply) => {
        const ip = request.body.ip
        const country = await getCountry(ip)
        return {country}
    })
}

async function getCountry(ip: string): Promise<string> {

    const resp = await (await fetch(`http://ip-api.com/json/${ip}`)).json() as {country: string}

    return resp.country
}

export default routes
