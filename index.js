const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const globalToken = process.env.MAX_BOT_TOKEN || '';

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

app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log('📩 Входящие данные от MAX:', JSON.stringify(req.body));
  } catch (err) {
    console.error('❌ Ошибка при получении Webhook:', err.message);
  }
});

app.post('/send-max', async (req, res) => {
  const token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  const rawId = inputPayload.chat_id || inputPayload.chatId || '';
  const text = inputPayload.text || '';

  const strId = String(rawId);
  const numId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;

  // Формируем все возможные варианты структуры тела и query-параметров
  const attempts = [
    // 1. Строковый chat_id в recipient.chat_id
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { recipient: { chat_type: 'chat', chat_id: strId }, body: { text: text } }
    },
    // 2. Через URL параметр chat_id
    {
      url: `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(strId)}`,
      data: { body: { text: text }, text: text }
    },
    // 3. Плоская структура с chat_id строкой
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { chat_id: strId, text: text, body: { text: text } }
    },
    // 4. Групповой чат через user_id/peer_id (для случаев, когда чат обрабатывается как диалоговый объект)
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { recipient: { chat_id: strId }, body: { text: text } }
    },
    // 5. Числовой chat_id
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { recipient: { chat_type: 'chat', chat_id: numId }, body: { text: text } }
    }
  ];

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const item = attempts[i];
    try {
      console.log(`[Попытка ${i + 1}/${attempts.length}] URL: ${item.url} | Payload:`, JSON.stringify(item.data));
      
      const response = await axios({
        method: 'post',
        url: item.url,
        data: item.data,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });

      console.log(`✅ УСПЕХ! Сообщение доставлено (вариант №${i + 1})`);
      return res.status(response.status).json(response.data);
    } catch (err) {
      const errorMsg = err.response?.data || err.message;
      console.log(`⚠️ Попытка №${i + 1} не прошла: ${JSON.stringify(errorMsg)}`);
      lastError = err;
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  return res.status(lastError?.response?.status || 400).json({
    error: lastError?.message,
    details: lastError?.response?.data || null
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
