const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const createPage = require('../services/browserService');
const { vars, selectors } = require('../services/config');

/**
 * Wait operations
 */
async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Convert bool
 */
function convertToBoolean(envVar) {
    if (!envVar) return true;
    
    const truthyValues = ['true', '1', 'yes'];
    return truthyValues.includes(envVar.toString().toLowerCase());
}

/**
 * Reload envs
 */
function reloadEnvVariables() {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '..', '..', '.env'), 'utf-8')
                        .split('\n')
                        .filter(line => line.trim() !== '' && !line.trim().startsWith('#'))
                        .forEach(line => {
                            const [key, value] = line.split('=');
                            process.env[key.trim()] = value.trim();
                        });
}

/**
 * Check Phone Number
 */
function isPhoneNumber(chatName) {
    return vars.PHONE_REGEX.test(chatName);
}

/**
 * Captures browser processes
 */
async function getChildPids(parentPid) {
    let command;

    if (process.platform === "win32") {
        command = `wmic process where (ParentProcessId=${parentPid}) get ProcessId`;
    } else {
        command = `pgrep -P ${parentPid}`;
    }
    try {
        const { stdout } = await execAsync(command);
        if (process.platform === "win32") {
            return stdout.split('\r\n')
                         .filter(line => /^\d+$/.test(line.trim()))
                         .map(Number);
        } else {
            return stdout.split('\n')
                         .filter(line => line.trim() !== '')
                         .map(Number);
        }
    } catch (error) {
        console.error(`Error getting child PIDs: ${error}`);
        return [];
    }
}

/**
 * Refines the process of clicking on the second menu to reduce the main function
 */
async function clickSecondMenuAndContactInfo(page) {
    try {
        await page.evaluate((selectors) => {
            const menuIcons = document.querySelectorAll(selectors.BAR_MENU);
            const secondMenuIcon = menuIcons[1];
            if (secondMenuIcon) {
                secondMenuIcon.click();
            } else {
                throw new Error('Second menu icon not found');
            }
        }, selectors);
        sleep(1);
        await page.evaluate((selectors) => {
            const contactInfoButton = Array.from(document.querySelectorAll(selectors.CLICK_BUTTON))
                                            .find(el => el.textContent === 'Contact info');
            if (contactInfoButton) {
                contactInfoButton.click();
            } else {
                throw new Error('Contact Info" button not found');
            }
        }, selectors);
    } catch (error) {
        console.error(`Error when trying to click on the second menu icon and "Contact Info": ${error}`);
        throw error;
    }
}

/**
 * Autoscroll Groups
 */
async function autoScrollAndCollectGroupNames(page, scrollSelector, groupSelector) {
    const groupNames = await page.evaluate(async (scrollSelector, groupSelector) => {
        const scrollElement = document.querySelector(scrollSelector);
        const groupNames = new Set();
        if (scrollElement) {
            await new Promise((resolve) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = scrollElement.scrollHeight;
                    scrollElement.scrollBy(0, distance);
                    totalHeight += distance;
                    
                    document.querySelectorAll(groupSelector).forEach(element => {
                        groupNames.add(element.innerText.trim());
                    });

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }
        return Array.from(groupNames);
    }, scrollSelector, groupSelector);
    return groupNames;
}

/**
 * Autoscroll contacts
 */
async function autoScrollAndCollectContacts(page, MAP_SCROLL, SCROLL_MAP_SELECTOR) {
    const contactsName = await page.evaluate(async (MAP_SCROLL, SCROLL_MAP_SELECTOR) => {
        const element = document.querySelector(MAP_SCROLL);
        const contactsName = new Set();
        if (element) {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = element.scrollHeight;
                    element.scrollBy(0, distance);
                    totalHeight += distance;
                    document.querySelectorAll(SCROLL_MAP_SELECTOR).forEach(element => {
                        contactsName.add(element.innerText);
                    });
                    if(totalHeight >= scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }
        return Array.from(contactsName);
    }, MAP_SCROLL, selectors.SCROLL_MAP);
    return contactsName;
}

module.exports = {
    getChildPids,
    clickSecondMenuAndContactInfo,
    convertToBoolean,
    reloadEnvVariables,
    isPhoneNumber,
    autoScrollAndCollectGroupNames,
    autoScrollAndCollectContacts
};
