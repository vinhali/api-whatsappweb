const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const browserService = require('./browserService');
const tokenUtils = require('../utils/tokenUtils');
const generalUtil = require('../utils/generalUtil');
const fileUtil = require('../utils/fileUtil');
const { error } = require('console');

const contactsNameFilePath = path.join(__dirname, '..', 'data', 'contactsName.json');
const contactsFilePath = path.join(__dirname, '..', 'data', 'contactsData.json');
const tokenDataPath = path.join(__dirname, '..', 'data', 'tokenData.json');
const groupsNameFilePath = path.join(__dirname, '..', 'data', 'groupsName.json');
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

let contactsData = {};
let chatMessagesHistory = {};

/**
 * Wait operations
 */
async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Initiates a new browser session and obtains the QR Code.
 * @returns {Promise<{qrCodeImageBuffer: Buffer, page: Object, token: string}>} An object containing the QR code image buffer, the Puppeteer page object, and the session token.
 */
async function getQRCode() {
    const token = tokenUtils.generateToken();
    const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
    const QRCodeSelector = 'canvas[aria-label="Scan me!"]';
    await page.waitForSelector(QRCodeSelector);
    const qrCodeCanvas = await page.$(QRCodeSelector);
    const qrCodeImageBuffer = await qrCodeCanvas.screenshot({ encoding: 'binary', type: 'png', omitBackground: true });
    return { qrCodeImageBuffer, page, token, browser };
}

/**
 * Terminates a specific session.
 * @param {string} token Identifier for the session.
 */
async function terminateSession(token) {
    console.log('GET call received at /terminate');
    if (fs.existsSync(tokenDataPath)) {
        tokenData = tokenUtils.readTokenData();
    }
    browserService.forceTerminateBrowserSession(tokenData[token].pid, token);
}

/**
 * Retrieves the phone number in the contact information.
 * @param {string} token Session identifier.
 * @returns {Array<Object>|Array<string>} Contacts as an array of objects or strings.
 */
async function getContacts(token, contactName) {
    console.log('GET call received at /contacts');
    try {
        const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
        await sleep(15);
        await page.click('span[data-icon="new-chat-outline"]');
        await sleep(5);
        await page.evaluate((name) => {
            return new Promise((resolve, reject) => {
                const scrollableElement = document.querySelector('.g0rxnol2.g0rxnol2.thghmljt.p357zi0d.rjo8vgbg.ggj6brxn.f8m0rgwh.gfz4du6o.ag5g9lrv.bs7a17vp.ov67bkzj');
                if (!scrollableElement) {
                    reject('Scrolling element not found');
                    return;
                }
                const searchString = name;
                let totalHeight = 0;
                const timer = setInterval(() => {
                    const previousHeight = totalHeight;
                    scrollableElement.scrollBy(0, 100);
                    totalHeight += 100;
                    if (scrollableElement.innerText.includes(searchString)) {
                        clearInterval(timer);
                        resolve();
                    } else if (totalHeight >= scrollableElement.scrollHeight && previousHeight === scrollableElement.scrollHeight) {
                        clearInterval(timer);
                        reject('Not found Contact Name');
                    }
                    scrollableElement.scrollTop = totalHeight;
                }, 100);
            });
        }, contactName);
        try {
            await page.click(`span[title="${contactName}"]`);
            console.log(`Clicked on ${contactName} without space`);
        } catch (error) {
            console.log(`Failed to click on ${contactName} without space. Trying with space...`);
            try {
                await page.click(`span[title="${contactName} "]`);
                console.log(`Clicked on ${contactName} with an extra space`);
            } catch (error) {
                console.log(`We couldn't identify what's in the contact string, it could be that the contact has emojis, please validate!`);
                return false;
            }
        }
        await sleep(5);               
        await page.click('div[contenteditable="true"][title="Type a message"]');
        await sleep(2);
        await generalUtil.clickSecondMenuAndContactInfo(page);
        await sleep(2);
        const phoneNumber = await page.evaluate(() => {
            const phoneSpan = document.querySelector('div.a4ywakfo.qt60bha0 span._11JPr.selectable-text.copyable-text span.enbbiyaj.e1gr2w1z.hp667wtd');
            if (phoneSpan && phoneSpan.innerText.includes('+55')) {
                return phoneSpan.innerText;
            } else {
                const spans = document.querySelectorAll('span[aria-label], span.selectable-text.copyable-text');
                let targetNumber = null;
                spans.forEach(span => {
                    const textContent = span.innerText || span.textContent;
                    if (textContent.includes('+55')) {
                        targetNumber = textContent;
                    }
                });
                return targetNumber;
            }
        });
        await page.close();
        console.log('Phone number successfully found:', contactName);

        if (fs.existsSync(contactsFilePath)) {
            const rawData = fs.readFileSync(contactsFilePath, 'utf8');
            contactsData = JSON.parse(rawData);
        }

        if (!contactsData[contactName]) {
            contactsData[contactName] = phoneNumber;
            fs.writeFileSync(contactsFilePath, JSON.stringify(contactsData, null, 2), 'utf8');
            console.log(`The contact ${contactName} was successfully added or updated.`);
        }

        return phoneNumber;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Retrieves new messages.
 * @param {string} token Session identifier.
 * @param {number} totalChats Number of chats to retrieve messages from.
 * @returns {Array<Object>} New messages as an array of objects.
 */
async function getNewMessages(token, totalChats) {
    console.log('GET call received at /new_messages');
    const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
    await sleep(15);
    const chatsData = await page.evaluate((totalChats) => {
        const chats = [];
        document.querySelectorAll('[role="row"]').forEach(chatElement => { 
            const nameElement = chatElement.querySelector('[dir="auto"]._11JPr');
            const lastMessageTimeElement = chatElement.querySelector('.aprpv14t');
            const lastMessageElement = chatElement.querySelector('[dir="ltr"]._11JPr');
            const statusCheckIcon = chatElement.querySelector('[data-icon="status-check"]');
            const statusDblCheckIcon = chatElement.querySelector('[data-icon="status-dblcheck"]');
            if (nameElement && lastMessageTimeElement && (!statusCheckIcon && !statusDblCheckIcon)) {
                const chatName = nameElement.innerText;
                const lastMessageTime = lastMessageTimeElement.innerText;
                const lastMessage = lastMessageElement ? lastMessageElement.innerText : '';
                chats.push({ chatName, lastMessageTime, lastMessage });
            }
        });
        return chats.slice(0, totalChats);
    }, totalChats);
    let contactsData = {};
    if (fs.existsSync(contactsFilePath)) {
        contactsData = JSON.parse(fs.readFileSync(contactsFilePath, 'utf8'));
    }
    let groupsName = [];
    if (fs.existsSync(groupsNameFilePath)) {
        const rawData = fs.readFileSync(groupsNameFilePath, 'utf8');
        groupsName = JSON.parse(rawData);
    }
    const chatsDataWithId = chatsData.reduce((acc, chat) => {
        if (!groupsName.includes(chat.chatName.trim().replace(emojiRegex, ''))) {
            let chatId = contactsData[chat.chatName.trim().replace(emojiRegex, '')];
            if (chatId || generalUtil.isPhoneNumber(chat.chatName)) {
                acc.push({
                    chatId: chatId,
                    lastMessageTime: chat.lastMessageTime,
                    lastMessage: chat.lastMessage
                });
            } else {
                console.error(`No chatId found for ${chat.chatName}, real-time search in contacts`);
                getContacts(token, chat.chatName);
                acc.push({
                    chatId: chat.chatName,
                    lastMessageTime: chat.lastMessageTime,
                    lastMessage: chat.lastMessage,
                    alertMessage: "The phone number is being processed in the background"
                });
            }
        }
        return acc;
    }, []);
    return chatsDataWithId;
}

/**
 * Sends a message to a specific contact or group.
 * @param {string} token Session identifier.
 * @param {string} chatId Identifier for the contact or group.
 * @param {string} message Message to be sent.
 */
async function sendMessage(token, chatId, message) {
    console.log('POST call received at /message');
    const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com/send/?phone=${chatId}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`);
    let attempt = 0;
    let messageSent = false;
    const maxAttempts = 12;
    while (attempt < maxAttempts && !messageSent) {
        try {
            await page.click('span[data-icon="send"]');
            messageSent = true;
            await sleep(15);
            console.log('Message sent successfully');
            break;
        } catch (error) {
            console.log('The page is still being processed. The next attempt is in 15 seconds');
            attempt++;
            await sleep(15);
        }
    }
    if (!messageSent) {
        throw new Error('Failed to send message.');
    } else {
        return true;
    }
}

/**
 * Get a message to a specific contact.
 * @param {string} token Session identifier.
 * @param {string} chatId Identifier for the contact or group.
 *  * @param {string} visibleName Profile Name.
 */
async function getMessage(token, chatId, visibleName) {
    console.log('GET call received at /message');
    let attempt = 0;
    let getMessage = false;
    const maxAttempts = 12;
    const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com/send/?phone=${chatId}&type=phone_number&app_absent=0`);
    while (attempt < maxAttempts && !getMessage) {
        try {
            await page.waitForSelector('div[contenteditable="true"][role="textbox"][title="Type a message"]', { visible: true });
            await sleep(5);
            const messages = await page.evaluate((visibleName) => {
                return Array.from(document.querySelectorAll('div.copyable-text'))
                    .map(el => {
                        const prePlainText = el.getAttribute('data-pre-plain-text');
                        const text = el.innerText;
                        if (!prePlainText || prePlainText.includes(visibleName)) {
                            return null;
                        }
                        return text.replace(prePlainText, '').trim();
                    })
                    .filter(Boolean);
            }, visibleName);
            const historyExists = chatId in chatMessagesHistory;
            const newMessages = messages.filter(msg => !historyExists || !chatMessagesHistory[chatId].includes(msg));
            newMessages.reverse();
            if (newMessages.length > 0) {
                chatMessagesHistory[chatId] = (chatMessagesHistory[chatId] || []).concat(newMessages).slice(-30);
                getMessage = true;
                return { messages: newMessages };
            } else {
                if (historyExists) {
                    console.log('No new messages');
                    getMessage = true;
                    return { messages: [] };
                } else {
                    throw new Error('No messages found');
                }
            }
        } catch (error) {
            console.log('Attempting to retrieve messages again in 15 seconds');
            attempt++;
            await sleep(15);
        }
    }
    if (!getMessage) {
        throw new Error('Failed to get message after maximum attempts.');
    }
}

/**
 * Maps and collects all WhatsApp data
 * @param {string} token Session identifier for which the browser instance is created.
 * @returns {Promise<boolean>} Indicates success or failure of the operation.
 */
async function mapGroups(token) {
    console.log('POST call received at /mapping by Groups');
    try {
        const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
        await sleep(10);
        console.log('Mapping all groups in a buffer');
        await page.click('span[data-icon="filter"]');
        await sleep(2);
        await page.click('span[data-icon="group"]');
        await sleep(2);

        const groupNames = await generalUtil.autoScrollAndCollectContacts(page, '#pane-side');

        fs.writeFileSync(groupsNameFilePath, JSON.stringify(groupNames, null, 2), 'utf8');

        console.log('groupsName.json file was saved successfully');
        await page.close();
        return true;
    } catch (error) {
        console.error('Failed to map groups:', error);
        await page.close();
        throw error;
    }
}

/**
 * Maps and collects all WhatsApp data
 * @param {string} token Session identifier for which the browser instance is created.
 * @returns {Promise<boolean>} Indicates success or failure of the operation.
 */
async function mapContacts(token) {
    console.log('POST call received at /mapping by Contacts');
    try {
        const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
        await sleep(10);
        console.log('Mapping all contacts in a buffer');
        await page.click('span[data-icon="filter"]');
        await sleep(2);
        await page.click('span[data-icon="contacts"]');
        await sleep(2);

        const contactsName = await generalUtil.autoScrollAndCollectContacts(page, '#pane-side');

        fs.writeFileSync(contactsNameFilePath, JSON.stringify(contactsName, null, 2), 'utf8');

        console.log('contactsName.json file was saved successfully');
        await page.close();
        return true;
    } catch (error) {
        console.error('Failed to map contacts:', error);
        await page.close();
        throw error;
    }
}

/**
 * Maps and collects all WhatsApp data
 * @param {string} token Session identifier for which the browser instance is created.
 * @returns {Promise<boolean>} Indicates success or failure of the operation.
 */
async function mapPhoneNumbers(token) {
    console.log('POST call received at /mapping by Phone Numbers');

    contactsNames = fileUtil.readJsonFile(contactsNameFilePath);
    contactsData = fileUtil.readJsonFile(contactsFilePath);

    for (let name of contactsNames) {
        if (!contactsData[name]) {
            const phoneNumber = await getContacts(token, name);
            contactsData[name] = phoneNumber;
            fs.writeFileSync(contactsFilePath, JSON.stringify(contactsData, null, 2), 'utf8');
        } else {
            console.log(`Name: ${name} already exists in contactsData`);
        }
    }

    console.log('contactsData.json file was saved successfully');
    return true;
}

module.exports = {
    getQRCode,
    terminateSession,
    getContacts,
    getNewMessages,
    sendMessage,
    getMessage,
    mapGroups,
    mapContacts,
    mapPhoneNumbers
};
