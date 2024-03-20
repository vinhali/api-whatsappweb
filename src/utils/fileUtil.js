const fs = require('fs');
const path = require('path');

/**
 * Reads data from a JSON file.
 * @param {string} filePath Full path to the JSON file.
 * Returns an object with the data read from the JSON file or null in case of error.
 */
const readJsonFile = (path) => {
    try {
        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path, 'utf-8');
            if (data) {
                return JSON.parse(data);
            }
            return {};
        }
        return {};
    } catch (error) {
        console.error("Error reading or parsing data:", error);
        return {};
    }
};

/**
 * Writes data to a JSON file.
 * @param {string} filePath Full path to the JSON file.
 * @param {Object} data Object with the data to be written to the JSON file.
 * @returns {boolean} Returns true if the data was written successfully, false in case of error.
 */
function writeJsonFile(filePath, data) {
    try {
        const dataStr = JSON.stringify(data, null, 2); // Formata o JSON para uma leitura mais fácil
        fs.writeFileSync(filePath, dataStr, { encoding: 'utf8' });
        return true;
    } catch (error) {
        console.error(`Error writing JSON file at ${filePath}: ${error}`);
        return false;
    }
}

/**
 * Ensures the existence of a directory.
 * @param {string} dirPath Path of the directory to be checked/created.
 * @returns {boolean} Returns true if the directory exists or was created successfully, false in case of error.
 */
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error(`Error ensuring directory exists at ${dirPath}: ${error}`);
        return false;
    }
}

module.exports = {
    readJsonFile,
    writeJsonFile,
    ensureDirectoryExists
};
