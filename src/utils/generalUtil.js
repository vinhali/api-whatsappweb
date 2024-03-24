const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const createPage = require('../services/browserService');

/**
 * Wait operations
 */
async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Check Phone Number
 */
function isPhoneNumber(chatName) {
    const phonePattern = /^\+55\s\d{2}\s\d{4,5}-\d{4}$/;
    return phonePattern.test(chatName);
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
        await page.evaluate(() => {
            const menuIcons = document.querySelectorAll('span[data-icon="menu"]');
            const secondMenuIcon = menuIcons[1];
            if (secondMenuIcon) {
                secondMenuIcon.click();
            } else {
                throw new Error('Second menu icon not found');
            }
        });
        sleep(5);
        await page.evaluate(() => {
            const contactInfoButton = Array.from(document.querySelectorAll('div[role="button"]'))
                                            .find(el => el.textContent === 'Contact info');
            if (contactInfoButton) {
                contactInfoButton.click();
            } else {
                throw new Error('Contact Info" button not found');
            }
        });
    } catch (error) {
        console.error(`Error when trying to click on the second menu icon and "Contact Info": ${error}`);
        throw error;
    }
}

async function autoScrollAndCollectGroupNames(page, selector) {
    const groupNames = await page.evaluate(async (selector) => {
        const element = document.querySelector(selector);
        const groupNames = new Set();
        if (element) {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = element.scrollHeight;
                    element.scrollBy(0, distance);
                    totalHeight += distance;
                    document.querySelectorAll('div[role="row"] div._21S-L span[dir="auto"]').forEach(element => {
                        groupNames.add(element.innerText);
                    });
                    if(totalHeight >= scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }
        return Array.from(groupNames);
    }, selector);
    return groupNames;
}

async function autoScrollAndCollectContacts(page, selector) {
    const contactsName = await page.evaluate(async (selector) => {
        const element = document.querySelector(selector);
        const contactsName = new Set();
        if (element) {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = element.scrollHeight;
                    element.scrollBy(0, distance);
                    totalHeight += distance;
                    document.querySelectorAll('div[role="row"] div._21S-L span[dir="auto"]').forEach(element => {
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
    }, selector);
    return contactsName;
}

module.exports = {
    getChildPids,
    clickSecondMenuAndContactInfo,
    isPhoneNumber,
    autoScrollAndCollectGroupNames,
    autoScrollAndCollectContacts
};
