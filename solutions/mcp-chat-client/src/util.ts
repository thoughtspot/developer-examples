const CACHE_NAME = 'fetch-ttl-cache';

export async function fetchWithTTL(url: string, options: RequestInit = {}, ttlSeconds?: number) {
    if (!ttlSeconds) {
        return fetch(url, options);
    }

    const cache = await caches.open(CACHE_NAME);
    const cacheKey = new Request(url, options);

    // Check cached response
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        const fetchedTime = cachedResponse.headers.get('sw-fetched-time');
        if (fetchedTime && (Date.now() - new Date(fetchedTime).getTime() < ttlSeconds * 1000)) {
            return cachedResponse.clone(); // return cached JSON
        }
    }

    // Fetch from network
    const response = await fetch(url, options);

    // Only cache GET requests (optional)
    if (options.method?.toUpperCase() !== 'POST' && response.ok) {
        const clonedResponse = response.clone();

        // Add custom header for TTL
        const headers = new Headers(clonedResponse.headers);
        headers.append('sw-fetched-time', new Date().toISOString());

        const responseToCache = new Response(await clonedResponse.blob(), { headers });
        await cache.put(cacheKey, responseToCache);
    }

    return response;
}


export class ImmutableObject<T extends object> {
    public static create<T extends object>(initialData: T = {} as T): T {
        const instance = new ImmutableObject(initialData);
        return instance.proxy;
    }


    private readonly _data: T;
    private readonly _proxy: T;

    constructor(initialData: T = {} as T) {
        this._data = { ...initialData } as T;
        this._proxy = this._createProxy(this._data);
    }

    public get proxy(): T {
        return this._proxy;
    }

    private _createProxy<K extends object>(target: K): K {
        const handler: ProxyHandler<K> = {
            get: (obj, prop) => {
                const value = obj[prop];
                // If value is an object, wrap it in a proxy for nested changes
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    return this._createProxy(value);
                }
                return value;
            },

            set: (obj, prop, value) => {
                // Create a shallow copy before mutation
                const newObj = { ...obj, [prop]: value };
                Object.assign(obj, newObj); // Update the original object reference
                return true;
            },

            deleteProperty: (obj, prop) => {
                const newObj = { ...obj };
                delete newObj[prop];
                Object.assign(obj, newObj);
                return true;
            },
        };

        return new Proxy(target, handler);
    }
}
