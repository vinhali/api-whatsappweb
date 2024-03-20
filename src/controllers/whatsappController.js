const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const validateQRCodeScanning = require('../utils/validateUtil').validateQRCodeScanning;
const generalUtil = require('../utils/generalUtil');
const basicAuthMiddleware = require('../middlewares/authMiddleware');
const tokenUtils = require('../utils/tokenUtils');
const fs = require('fs');
const path = require('path');
const tokenDataPath = path.join(__dirname, '..', 'data', 'tokenData.json');

router.use((req, res, next) => {
    if (fs.existsSync(tokenDataPath)) {
        req.tokenData = tokenUtils.readTokenData();
    } else {
        req.tokenData = {};
    }
    next();
});

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: WhatsApp integration endpoints
 *   author: Luis Vinhali
 */

/**
 * @swagger
 * /api/whatsapp/qr_code:
 *   get:
 *     summary: Retrieves QR code for WhatsApp authentication.
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: A successful response with QR code image.
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/qr_code', basicAuthMiddleware, async (req, res) => {
    try {
        const { qrCodeImageBuffer, page, token, browser } = await whatsappService.getQRCode();
        res.setHeader('Content-Type', 'image/png');
        res.send(qrCodeImageBuffer);
        console.log('Access the /api/whatsapp/qr_code route to scan the QRCode (time limit is 2 minutes)');
        validateQRCodeScanning(page, browser, token).catch(console.error);
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).send('Failed to generate QR Code');
        }
    }
});

/**
 * @swagger
 * /api/whatsapp/terminate:
 *   post:
 *     summary: Terminates a WhatsApp session.
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Session token.
 *     responses:
 *       200:
 *         description: Session terminated successfully.
 *       400:
 *         description: Token is required.
 *       401:
 *         description: Invalid token.
 */
router.post('/terminate', basicAuthMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        await whatsappService.terminateSession(token);
        res.status(200).json({ message: 'Session terminated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to terminate session' });
    }
});

/**
 * @swagger
 * /api/whatsapp/contacts:
 *   post:
 *     summary: Retrieves the phone number in the contact information.
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactName:
 *                 type: string
 *                 description: Contact Name.
 *               token:
 *                 type: string
 *                 description: Session token.
 *     responses:
 *       200:
 *         description: Return Phone Number.
 *       400:
 *         description: Token and contactName are required.
 *       401:
 *         description: Invalid token.
 */
router.post('/contacts', basicAuthMiddleware, async (req, res) => {
    try {
        const { token, contactName } = req.body;
        if (!token || !contactName) {
            return res.status(400).json({ message: 'Token and contactName are required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        const contacts = await whatsappService.getContacts(token, contactName);
        res.status(200).json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to get contacts' });
    }
});

/**
 * @swagger
 * /api/whatsapp/new_messages:
 *   post:
 *     summary: Endpoint to retrieve new messages from specified chats.
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalChats:
 *                 type: integer
 *                 description: The total number of chats to be searched.
 *               token:
 *                 type: string
 *                 description: Session token.
 *     responses:
 *       200:
 *         description: It returns the new messages as JSON.
 *       400:
 *         description: Token and totalChats are required.
 *       401:
 *         description: Invalid token.
 */
router.post('/new_messages', basicAuthMiddleware, async (req, res) => {
    try {
        const { token, totalChats } = req.body;
        if (!token || !totalChats) {
            return res.status(400).json({ message: 'Token and totalChats are required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        const newMessages = await whatsappService.getNewMessages(token, totalChats);
        res.status(200).json(newMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to get new messages' });
    }
});

/**
 * @swagger
 * /api/whatsapp/message:
 *   post:
 *     summary: Sends a message to a specific contact.
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message to be sent.
 *               chatId:
 *                 type: string
 *                 description: Identifier for the contact or group.
 *               token:
 *                 type: string
 *                 description: Session token.
 *     responses:
 *       200:
 *         description: Message sent successfully.
 *       400:
 *         description: Token, chatId, and message are required.
 *       401:
 *         description: Invalid token.
 */
router.post('/message', basicAuthMiddleware, async (req, res) => {
    try {
        const { token, chatId, message } = req.body;
        if (!token || !chatId || !message) {
            return res.status(400).json({ message: 'Token, chatId, and message are required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        await whatsappService.sendMessage(token, chatId, message);
        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

/**
 * @swagger
 * /api/whatsapp/message:
 *   get:
 *     summary: Retrieve messages from a specific contact
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: query
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifier for the contact or group.
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Session token.
 *       - in: query
 *         name: visibleName
 *         schema:
 *           type: string
 *         description: Profile name (sender), optional.
 *     responses:
 *       200:
 *         description: Successfully retrieved messages.
 *       400:
 *         description: Token and chatId are required.
 *       401:
 *         description: Invalid token.
 */
router.get('/message', basicAuthMiddleware, async (req, res) => {
    try {
        const { token, chatId, visibleName } = req.query;
        if (!token || !chatId || !visibleName) {
            return res.status(400).json({ message: 'Token, chatId and visibleName are required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        const messages = await whatsappService.getMessage(token, chatId, visibleName);
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to get messages' });
    }
});

/**
 * @swagger
 * /api/whatsapp/mapping:
 *   post:
 *     summary: Map contacts, groups, and phone numbers.
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Session token to map.
 *     responses:
 *       200:
 *         description: Mapped contacts, groups, and phone numbers successfully.
 *       400:
 *         description: Token is required.
 *       401:
 *         description: Invalid token.
 */
router.post('/mapping', basicAuthMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        if (!req.tokenData[token]) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        await whatsappService.mapGroups(token);
        await whatsappService.mapContacts(token);
        await whatsappService.mapPhoneNumbers(token);
        res.status(200).json({ message: 'Mapped contacts, groups, and phone numbers successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to map contacts, groups, and phone numbers' });
    }
});

module.exports = router;
