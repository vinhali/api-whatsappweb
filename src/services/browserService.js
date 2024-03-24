const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const tokenUtils = require('../utils/tokenUtils');
const generalUtils = require('../utils/generalUtil');
const { vars, paths } = require('./config');

let browsers = {};

/**
 * Initializes a new Puppeteer browser if one does not exist for the token provided.
 * @param {string} token Unique identifier for the browser session.
 * @returns Returns a browser instance for the given token.
 */
async function initBrowser(token) {
    generalUtils.reloadEnvVariables();
    if (fs.existsSync(paths.TOKEN_DATA_PATH)) {
        tokenData = tokenUtils.readTokenData();
    } else {
        tokenData = {};
    }
    if (!browsers[token]) {
        browsers[token] = await puppeteer.launch({
            headless: generalUtils.convertToBoolean(process.env.HEADLESS_MODE),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--lang=en-US'
            ]
        });
        console.log(`Browser initialized for token: ${token}`);
        const browserProcess = browsers[token].process();
        const childPids = await generalUtils.getChildPids(browserProcess.pid);
        console.log(`Browser PID ${browserProcess.pid}`);
        console.log(`Child PIDs: ${childPids.join(', ')}`);
        const currentDate = new Date().toISOString();
        tokenData[token] = {
            pid: browserProcess.pid,
            childPids: childPids,
            created: currentDate,
        };
        tokenUtils.saveTokenDataToFile(tokenData);
    }
    return browsers[token];
}

/**
 * Creates a new page in the browser associated with the token provided.
 * @param {string} token Unique identifier for the browser session.
 * @returns Returns a new page within the browser for the token provided.
 */
async function createPage(token, msgUrl) {
    const browser = await initBrowser(token);
    const page = await browser.newPage();
    await page.setUserAgent(vars.USER_AGENT);
    await page.goto(msgUrl, { waitUntil: vars.WAIT_UNTIL });
    return { browser, page };
}

/**
 * Closes the browser associated with the token provided and removes it from the browsers object.
 * @param {string} token Unique identifier for the browser session.
 */
async function closeBrowser(token) {
    if (browsers[token]) {
        await browsers[token].close();
        delete browsers[token];
        console.log(`Browser closed for token: ${token}`);
    }
}

/**
 * Attempts to terminate a browser session by sending SIGTERM, falling back to SIGKILL if unsuccessful.
 * @param {string} pid The process ID of the browser session.
 * @param {string} token The token associated with the browser session.
 */
function forceTerminateBrowserSession(pid, token) {
    try {
        process.kill(pid, 'SIGTERM');
        console.log(`SIGTERM sent to PID ${pid}`);
        if (browsers[token]) {
            browsers[token].close();
            delete browsers[token];
        }
        if (tokenData[token]) {
            tokenUtils.removeToken(token);
        }
    } catch (error) {
        console.log(`SIGTERM failed for PID ${pid}, trying SIGKILL`);
        process.kill(pid, 'SIGKILL');
        if (tokenData[token]) {
            tokenUtils.removeToken(token);
        }
    }
}

module.exports = {
    createPage,
    closeBrowser,
    forceTerminateBrowserSession
};
