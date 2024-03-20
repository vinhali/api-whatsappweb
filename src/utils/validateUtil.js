const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { browserService } = require('../services/browserService');
const tokenUtils = require('../utils/tokenUtils');

const tokenDataPath = path.join(__dirname, '..', 'data', 'tokenData.json');

/**
 * Waits for a QR Code to appear and checks if it has been scanned within a set interval.
 * @param {Object} page The Puppeteer page object associated with the current session.
 * @param {string} token The session token, used for identifying the browser session.
 * @param {Function} terminateBrowserSession A callback function to terminate the browser session.
 * @returns {Promise<void>} Resolves when the QR code is scanned or the scan time exceeds.
 */
async function validateQRCodeScanning(page, browser, token) {
    let isQRCodeScanned = false;

    if (fs.existsSync(tokenDataPath)) {
        tokenData = tokenUtils.readTokenData();
    }

    const checkQRCodeScanned = async () => {
        const qrCodeElement = await page.$('canvas[aria-label="Scan me!"]');
        return !qrCodeElement;
    };

    const checkInterval = setInterval(async () => {
        if (await checkQRCodeScanned()) {
            clearInterval(checkInterval);
            console.log('QR Code has been scanned.');
            isQRCodeScanned = true;
            await page.close();
        } else {
            console.log('Waiting for QR Code to be scanned...');
        }
    }, 10000);

    setTimeout(async () => {
        clearInterval(checkInterval);
        if (!isQRCodeScanned) {
            console.log('Scan time exceeded. Terminating session.');
            delete tokenData[token];
            await browser.close();
        }
    }, 120000);
}

module.exports = { validateQRCodeScanning };
