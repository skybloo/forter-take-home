import { FastifyPluginAsync, RequestGenericInterface } from "fastify";
const config = require('../../config.json')
const cache: {[ip_address: string]: string} = {}
const rateLimitCount: RateCounter = {ipapi: {}, ipstack: {}}
interface RateCounter {
    ipapi: {[hour: string]: number}
    ipstack: {[hour: string]: number}
}

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

export async function getCountry(ip: string): Promise<string> {
    if (ip in cache) {
        return cache[ip]
    }
    // this method has a potential bug if it's called exactly 24 hours apart
    const hour = new Date().getHours().toString()
    try {
        if (rateLimitCount.ipapi?.[hour] >= config.apiRateLimits.ipapi ) {
            // TODO make rate limit error
            throw Error()
        } else if (rateLimitCount.ipapi?.[hour]) {
            rateLimitCount.ipapi[hour] += 1
        } else {
            rateLimitCount.ipapi = {[hour]: 1}
        }
        const resp = await (await fetch(`http://ip-api.com/json/${ip}`)).json() as {country: string}
        cache[ip] = resp.country
        return resp.country
    } catch (e) {
        try {
            if (rateLimitCount.ipstack?.[hour] >= config.apiRateLimits.ipstack ) {
                // TODO make rate limit error
                throw Error()
            } else if (rateLimitCount.ipstack?.[hour]) {
                rateLimitCount.ipstack[hour] += 1
            } else {
                rateLimitCount.ipstack = {[hour]: 1}
            }
            const resp = await (await fetch(`https://api.ipstack.com/${ip}?access_key=${config.accessKey}`)).json() as {country_name: string}
            cache[ip] = resp.country_name
            return resp.country_name
        } catch (e) {
            throw new Error('backend error')
        }
    }
}

export default routes
