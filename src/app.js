require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swaggerConfig');
const whatsappRoutes = require('./controllers/whatsappController');
const basicAuthMiddleware = require('./middlewares/authMiddleware');
const app = express();
const port = process.env.PORT || 5000;

/**
 * Luis Vinhali - API Whatsapp 1.0.0
 * Send messages, receive messages and intercept new messages
 */
app.use('/api-docs', basicAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(bodyParser.json());
app.all('/api/whatsapp', (req, res) => {
    res.status(200).send('API Whatsapp 1.0.0 - Luis Vinhali');
});
app.use('/api/whatsapp', whatsappRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
