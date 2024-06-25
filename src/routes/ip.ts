import { FastifyPluginAsync, RequestGenericInterface } from "fastify";
const config = {api: 'ip-api'}
const access_key = 'asdfadfas'
const cache: {[ip_address: string]: string} = {}

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
    if (ip in cache) {
        return cache[ip]
    }
    if (config.api === 'ip-api'){
        const resp = await (await fetch(`http://ip-api.com/json/${ip}`)).json() as {country: string}
        cache[ip] = resp.country
        return resp.country
    } else if (config.api === 'ipstack') {
        const resp = await (await fetch(`https://api.ipstack.com/${ip}?access_key=${access_key}`)).json() as {country_name: string}
        cache[ip] = resp.country_name
        return resp.country_name
    } else {
        throw Error('unconfigured api option')
    }
}


export default routes
