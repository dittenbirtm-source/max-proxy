const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false // Игнорируем ошибки SSL от MAX API
});

let globalToken = 'f9LHodD0cOJCVdaARDFpMhx5T4B5LZiSIFSXATaFliPn-ndgexawgawYR6SiATW8KWQ6g7HEa-hLcHBDhVtS';

// 1. Привязка Webhook через Прокси
app.post('/set-webhook', async (req, res) => {
  const token = req.body.token || globalToken;
  const webhookUrl = req.body.webhook_url || 'https://max-proxy-yfj7.onrender.com/max-webhook';

  try {
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/subscriptions',
      data: { url: webhookUrl },
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    console.log('✅ Webhook успешно зарегистрирован:', response.data);
    return res.json({ success: true, data: response.data });
  } catch (err) {
    console.error('❌ Ошибка установки Webhook:', err.response?.data || err.message);
    return res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// 2. WEBHOOK: Получение входящих сообщений
app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200);
  
  try {
    const data = req.body;
    console.log('📩 Входящее событие от MAX:', JSON.stringify(data));

    const chatId = data.chat_id || data.message?.chat?.id || data.recipient?.chatId;

    if (chatId) {
      const responseText = `🤖 ID этого чата в MAX API:\n${chatId}`;

      await axios({
        method: 'post',
        url: 'https://platform-api2.max.ru/messages',
        data: { chat_id: chatId, text: responseText },
        headers: { 'Authorization': globalToken, 'Content-Type': 'application/json' },
        httpsAgent: httpsAgent
      });
      
      console.log(`✅ ID (${chatId}) отправлен в чат!`);
    }
  } catch (err) {
    console.error('❌ Ошибка обработки Webhook:', err.response?.data || err.message);
  }
});

// 3. PROXY: Отправка из Google Apps Script
app.post('/send-max', async (req, res) => {
  let token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  if (token) globalToken = token;

  const chatId = inputPayload.chat_id || inputPayload.chatId || inputPayload.recipient?.chatId;
  const text = inputPayload.text || '';

  try {
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/messages',
      data: { chat_id: chatId, text: text },
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      httpsAgent: httpsAgent
    });

    console.log(`✅ Сообщение отправлено в чат ${chatId}`);
    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Ошибка отправки в MAX:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
