const basicAuth = require('basic-auth');

/**
 * Endpoint to HTTP Basic authentication
 * Returns as denied or passed
 */
const basicAuthMiddleware = (req, res, next) => {

    const user = basicAuth(req);

    const USERNAME = process.env.BASIC_AUTH_USERNAME;
    const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

    if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Authentication required.');
        return;
    }

    next();
};

module.exports = basicAuthMiddleware;
