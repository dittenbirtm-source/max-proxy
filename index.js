const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

// Отключение строгой проверки SSL-сертификатов при необходимости
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const globalToken = process.env.MAX_BOT_TOKEN || '';

// Регистрация Webhook
app.post('/set-webhook', async (req, res) => {
  const token = req.body.token || globalToken;
  const webhookUrl = req.body.webhook_url || 'https://max-proxy-yfj7.onrender.com/max-webhook';

  try {
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/subscriptions',
      data: { url: webhookUrl },
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      httpsAgent: httpsAgent
    });

    console.log('✅ Webhook успешно зарегистрирован:', response.data);
    return res.json({ success: true, data: response.data });
  } catch (err) {
    console.error('❌ Ошибка установки Webhook:', err.response?.data || err.message);
    return res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// Эндпоинт для приема входящих Webhook от MAX
app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log('📩 Входящие данные от MAX:', JSON.stringify(req.body));
  } catch (err) {
    console.error('❌ Ошибка при получении Webhook:', err.message);
  }
});

// Эндпоинт отправки сообщений (использует проверенный рабочий формат через URL-параметр)
app.post('/send-max', async (req, res) => {
  const token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  const chatId = inputPayload.chat_id || inputPayload.chatId || '';
  const text = inputPayload.text || '';

  try {
    const response = await axios({
      method: 'post',
      url: `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`,
      data: {
        body: { text: text }
      },
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    console.log('✅ Сообщение успешно доставлено!');
    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Ошибка отправки в MAX:', err.response?.data || err.message);
    return res.status(err.response?.status || 400).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
