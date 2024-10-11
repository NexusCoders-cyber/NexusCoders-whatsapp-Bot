class RateLimiter {
    constructor(limit, window) {
        this.limit = limit;
        this.window = window;
        this.clients = new Map();
    }

    isRateLimited(clientId) {
        const now = Date.now();
        let client = this.clients.get(clientId);

        if (!client) {
            client = { count: 0, resetTime: now + this.window };
            this.clients.set(clientId, client);
        }

        if (now > client.resetTime) {
            client.count = 0;
            client.resetTime = now + this.window;
        }

        client.count++;

        return client.count > this.limit;
    }
}

module.exports = new RateLimiter(5, 60000);
