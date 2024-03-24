const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const browserService = require('./browserService');
const tokenUtils = require('../utils/tokenUtils');
const generalUtil = require('../utils/generalUtil');
const fileUtil = require('../utils/fileUtil');
const { vars, paths, selectors, getContactMenuBarSelector  } = require('./config');

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
    const { browser, page } = await browserService.createPage(token, selectors.WHATSAPP_URL);
    await page.waitForSelector(selectors.QR_CODE_SELECTOR);
    const qrCodeCanvas = await page.$(selectors.QR_CODE_SELECTOR);
    const qrCodeImageBuffer = await qrCodeCanvas.screenshot({ encoding: 'binary', type: 'png', omitBackground: true });
    return { qrCodeImageBuffer, page, token, browser };
}

/**
 * Terminates a specific session.
 * @param {string} token Identifier for the session.
 */
async function terminateSession(token) {
    console.log('GET call received at /terminate');
    if (fs.existsSync(paths.TOKEN_DATA_PATH)) {
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
    const { browser, page } = await browserService.createPage(token, `https://web.whatsapp.com`);
    try {
        await sleep(5);
        await page.waitForSelector(selectors.CONTACT_OPEN_NEW_CHAT, {visible: true});
        await page.click(selectors.CONTACT_OPEN_NEW_CHAT);
        await page.waitForSelector(selectors.CONTACT_NAME_SEARCH);
        await page.type(selectors.CONTACT_NAME_SEARCH, contactName);
        try {
            const contactMenuBarSelector = getContactMenuBarSelector(contactName, false);
            await page.waitForSelector(contactMenuBarSelector, {visible: true});
            await page.hover(contactMenuBarSelector);
            await page.click(contactMenuBarSelector);
        } catch (error) {
            console.log(`Failed to click on ${contactName} without space. Trying with space...`);
            const contactMenuBarSelector = getContactMenuBarSelector(contactName, true);
            await page.waitForSelector(contactMenuBarSelector, {visible: true});
            await page.hover(contactMenuBarSelector);
            await page.click(contactMenuBarSelector);
        }
        await sleep(1);
        await generalUtil.clickSecondMenuAndContactInfo(page, selectors);
        await sleep(1);
        const phoneNumber = await page.evaluate((selectors) => {
            const phoneSpan = document.querySelector(selectors.CONTACT_FIELD_PHONE_NUMBER);
            if (phoneSpan && phoneSpan.innerText.includes('+55')) {
                return phoneSpan.innerText;
            } else {
                const spans = document.querySelectorAll(selectors.CONTACT_PHONE_NUMBER);
                let targetNumber = null;
                spans.forEach(span => {
                    const textContent = span.innerText || span.textContent;
                    if (textContent.includes('+55')) {
                        targetNumber = textContent;
                    }
                });
                return targetNumber;
            }
        }, selectors);
        console.log('Phone number successfully found:', contactName);
        await page.close();
        return phoneNumber;
    } catch (error) {
        await page.close();
        throw new Error(error);
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
    const { browser, page } = await browserService.createPage(token, selectors.WHATSAPP_URL);
    try {
        await sleep(5);
        const chatsData = await page.evaluate(({CHATS_ROW, CHAT_NAME, CHAT_TIME_MESASGE, CHAT_LAST_MESSAGE, CHAT_STATUS_CHECK_MESSAGE, CHAT_STATUS_DOUBLE_CHECK_MESSAGE}, totalChats) => {
            const chats = [];
            document.querySelectorAll(CHATS_ROW).forEach(chatElement => {
                const nameElement = chatElement.querySelector(CHAT_NAME);
                const lastMessageTimeElement = chatElement.querySelector(CHAT_TIME_MESASGE);
                const lastMessageElement = chatElement.querySelector(CHAT_LAST_MESSAGE);
                const statusCheckIcon = chatElement.querySelector(CHAT_STATUS_CHECK_MESSAGE);
                const statusDblCheckIcon = chatElement.querySelector(CHAT_STATUS_DOUBLE_CHECK_MESSAGE);
                if (nameElement && lastMessageTimeElement && (!statusCheckIcon && !statusDblCheckIcon)) {
                    const chatName = nameElement.innerText;
                    const lastMessageTime = lastMessageTimeElement.innerText;
                    const lastMessage = lastMessageElement ? lastMessageElement.innerText : '';
                    chats.push({ chatName, lastMessageTime, lastMessage });
                }
            });
            return chats.slice(0, totalChats);
        }, selectors, totalChats);
        let contactsData = {};
        if (fs.existsSync(paths.CONTACTS_NUMBERS_PATH)) {
            contactsData = fileUtil.readJsonFile(paths.CONTACTS_NUMBERS_PATH);
        }
        let groupsName = [];
        if (fs.existsSync(paths.GROUPS_NAME_PATH)) {
            groupsName = fileUtil.readJsonFile(paths.GROUPS_NAME_PATH);
        }
        const chatsDataWithId = chatsData.reduce((acc, chat) => {
            console.error(`Searching for contact details: ${chat.chatName}`);
            if (!groupsName.includes(chat.chatName.trim().replace(vars.EMOJI_REGEX, ''))) {
                let chatId = contactsData[chat.chatName.trim().replace(vars.EMOJI_REGEX, '')];
                if (chatId) {
                    console.error(`chatId found for`);
                    acc.push({
                        chatId: chatId,
                        lastMessageTime: chat.lastMessageTime,
                        lastMessage: chat.lastMessage
                    });
                } else if (generalUtil.isPhoneNumber(chat.chatName)) {
                    console.error(`Chat name is already a phone number`);
                    acc.push({
                        chatId: chat.chatName,
                        lastMessageTime: chat.lastMessageTime,
                        lastMessage: chat.lastMessage
                    });
                } else {
                    console.error(`No chatId found, added with the name...`);
                    acc.push({
                        chatId: chat.chatName,
                        lastMessageTime: chat.lastMessageTime,
                        lastMessage: chat.lastMessage,
                        alertMessage: "Please use the /mapping route to map the new contact"
                    });
                }
            } else {
                console.log(`That's a group, skipping...`);
            }
            return acc;
        }, []);
        await page.close();
        return chatsDataWithId;
    } catch (error) {
        await page.close();
        throw new Error(error);
    }
}

/**
 * Sends a message to a specific contact or group.
 * @param {string} token Session identifier.
 * @param {string} chatId Identifier for the contact or group.
 * @param {string} message Message to be sent.
 */
async function sendMessage(token, chatId, message) {
    console.log('POST call received at /message');
    const { browser, page } = await browserService.createPage(token, `${selectors.WHATSAPP_URL}/send/?phone=${chatId}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`);
    try {
        let attempt = 0;
        let messageSent = false;
        const maxAttempts = 12;
        while (attempt < maxAttempts && !messageSent) {
            try {
                await page.click(selectors.POST_SEND_MESSAGE);
                messageSent = true;
                await sleep(2);
                await page.close();
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
    } catch (error) {
        await page.close();
        throw new Error(error);
    }
}

/**
 * Get a message to a specific contact.
 * @param {string} token Session identifier.
 * @param {string} chatId Identifier for the contact or group.
 * @param {string} visibleName Profile Name.
 */
async function getMessage(token, chatId, visibleName) {
    console.log('GET call received at /message');
    const { page } = await browserService.createPage(token, `${selectors.WHATSAPP_URL}/send/?phone=${chatId}&type=phone_number&app_absent=0`);
    let attempt = 0;
    let getMessage = false;
    const maxAttempts = 12;
    while (attempt < maxAttempts && !getMessage) {
        try {
            await page.waitForSelector(selectors.GET_MESSAGE_TYPE_BOX, { visible: true });
            await sleep(5);
            const messages = await page.evaluate(({ GET_MESSAGE_FIELD_MESSAGES, GET_MESSAGE_TEXT }, visibleName) => {
                const messageElements = Array.from(document.querySelectorAll(GET_MESSAGE_FIELD_MESSAGES));
                return messageElements.map(el => {
                    const prePlainText = el.getAttribute(GET_MESSAGE_TEXT);
                    const text = el.innerText;
                    if (!prePlainText || prePlainText.includes(visibleName)) {
                        return null;
                    }
                    return text.replace(prePlainText, '').trim();
                }).filter(Boolean);
            }, {GET_MESSAGE_FIELD_MESSAGES: selectors.GET_MESSAGE_FIELD_MESSAGES, GET_MESSAGE_TEXT: selectors.GET_MESSAGE_TEXT}, visibleName);
            const historyExists = chatId in chatMessagesHistory;
            const newMessages = messages.filter(msg => !historyExists || !chatMessagesHistory[chatId].includes(msg));
            if (newMessages.length > 0) {
                chatMessagesHistory[chatId] = (chatMessagesHistory[chatId] || []).concat(newMessages).slice(-30);
                getMessage = true;
                return { messages: newMessages };
            } else {
                console.log(historyExists ? 'No new messages' : 'No messages found');
                getMessage = true;
                return { messages: [] };
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
    const { browser, page } = await browserService.createPage(token, selectors.WHATSAPP_URL);
    try {
        await sleep(10);
        console.log('Mapping all groups in a buffer');
        await page.click(selectors.MAP_FILTER_CHAT);
        await sleep(2);
        await page.click(selectors.MAP_FILTER_SELECT_GROUPS);
        await sleep(2);
        const groupNames = await generalUtil.autoScrollAndCollectContacts(page, selectors.MAP_SCROLL, selectors.SCROLL_MAP);
        fileUtil.writeJsonFile(paths.GROUPS_NAME_PATH, groupNames);
        console.log('groupsName.json file was saved successfully');
        await page.close();
        return true;
    } catch (error) {
        await page.close();
        throw new Error(error);
    }
}

/**
 * Maps and collects all WhatsApp data
 * @param {string} token Session identifier for which the browser instance is created.
 * @returns {Promise<boolean>} Indicates success or failure of the operation.
 */
async function mapContacts(token) {
    console.log('POST call received at /mapping by Contacts');
    const { browser, page } = await browserService.createPage(token, selectors.WHATSAPP_URL);
    try {
        await sleep(10);
        console.log('Mapping all contacts in a buffer');
        await page.click(selectors.MAP_FILTER_CHAT);
        await sleep(2);
        await page.click(selectors.MAP_FILTER_SELECT_CONTACTS);
        await sleep(2);
        const contactsName = await generalUtil.autoScrollAndCollectContacts(page, selectors.MAP_SCROLL, selectors.SCROLL_MAP);
        fileUtil.writeJsonFile(paths.CONTACTS_NAME_PATH, contactsName);
        console.log('contactsName.json file was saved successfully');
        await page.close();
        return true;
    } catch (error) {
        await page.close();
        throw new Error(error);
    }
}

/**
 * Maps and collects all WhatsApp data
 * @param {string} token Session identifier for which the browser instance is created.
 * @returns {Promise<boolean>} Indicates success or failure of the operation.
 */
async function mapPhoneNumbers(token) {
    console.log('POST call received at /mapping by Phone Numbers');
    try {
        contactsNames = fileUtil.readJsonFile(paths.CONTACTS_NAME_PATH);
        contactsData = fileUtil.readJsonFile(paths.CONTACTS_NUMBERS_PATH);
        for (let name of contactsNames) {
            if (!contactsData[name]) {
                const phoneNumber = await getContacts(token, name);
                contactsData[name] = phoneNumber;
                fileUtil.writeJsonFile(paths.CONTACTS_NUMBERS_PATH, contactsData);
            } else {
                console.log(`Contact Name ${name} already exists in contactsData`);
            }
        }
        console.log('contactsData.json file was saved successfully');
        return true;
    } catch (error) {
        await page.close();
        throw new Error(error);
    }
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
