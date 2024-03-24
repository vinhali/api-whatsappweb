const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { paths } = require('../services/config');

/**
 * Generates a unique token using secure cryptography.
 * @returns {string} A unique token.
 */
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Saves the token data in a JSON file.
 * @param {string} token The token to be saved.
 * @param {Object} data Data associated with the token.
 */
function saveTokenDataToFile(tokenData) {
    try {
        fs.writeFileSync(paths.TOKEN_DATA_PATH, JSON.stringify(tokenData, null, 2), 'utf-8');
        console.log("Token data successfully saved.");
    } catch (error) {
        console.error("Failed to save token data:", error);
    }
}

/**
 * Reads the token data from a JSON file.
 * @returns {Object} The token data.
 */
const readTokenData = () => {
    try {
        if (fs.existsSync(paths.TOKEN_DATA_PATH, JSON)) {
            const data = fs.readFileSync(paths.TOKEN_DATA_PATH, JSON, 'utf-8');
            if (data) {
                return JSON.parse(data);
            }
            return {};
        }
        return {};
    } catch (error) {
        console.error("Error reading or parsing token data:", error);
        return {};
    }
};

/**
 * Validates whether a token is valid by checking the existence of its data in the file.
 * @param {string} token The token to be validated.
 * @returns {boolean} True if the token is valid, false otherwise.
 */
function validateToken(token) {
    const tokenData = readTokenData();
    return tokenData.hasOwnProperty(token);
}

/**
 * Removes a token and its associated data.
 * @param {string} token The token to be removed.
 */
function removeToken(token) {
    const tokenData = readTokenData();

    if (tokenData.hasOwnProperty(token)) {
        delete tokenData[token];
        try {
            fs.writeFileSync(paths.TOKEN_DATA_PATH, JSON, JSON.stringify(tokenData, null, 2), 'utf-8');
            console.log(`Token removed: ${token}`);
        } catch (error) {
            console.error(`Failed to remove token: ${token}. Error: ${error}`);
        }
    }
}

module.exports = {
    generateToken,
    saveTokenDataToFile,
    readTokenData,
    validateToken,
    removeToken
};
