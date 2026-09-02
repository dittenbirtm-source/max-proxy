const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const globalToken = process.env.MAX_BOT_TOKEN || '';

// 1. УСТАНОВКА ВЕБХУКА
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

// 2. ВХОДЯЩИЕ ВЕБХУКИ
app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log('📩 Входящие данные от MAX:', JSON.stringify(req.body));
  } catch (err) {
    console.error('❌ Ошибка при получении Webhook:', err.message);
  }
});

// 3. ОТПРАВКА СООБЩЕНИЙ
app.post('/send-max', async (req, res) => {
  const token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  const rawId = inputPayload.chat_id || inputPayload.chatId || '';
  const text = inputPayload.text || '';

  // Преобразуем ID в число, если это возможно
  const numericId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;

  // Формируем варианты структуры recipient под требования MAX API
  const attempts = [
    // Вариант 1: Групповой чат (структура из вашего вебхука)
    {
      recipient: { chat_type: 'chat', chat_id: numericId },
      body: { text: text }
    },
    // Вариант 2: Личный диалог
    {
      recipient: { chat_type: 'dialog', chat_id: numericId },
      body: { text: text }
    },
    // Вариант 3: Канал
    {
      recipient: { chat_type: 'channel', chat_id: numericId },
      body: { text: text }
    },
    // Вариант 4: Прямой пользователь
    {
      recipient: { chat_type: 'dialog', user_id: numericId },
      body: { text: text }
    }
  ];

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const payload = attempts[i];
    try {
      console.log(`[Попытка ${i + 1}/${attempts.length}] Передача payload:`, JSON.stringify(payload));
      
      const response = await axios({
        method: 'post',
        url: 'https://platform-api2.max.ru/messages',
        data: payload,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });

      console.log(`✅ УСПЕХ! Сообщение доставлено (вариант №${i + 1})`);
      return res.status(response.status).json(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      console.log(`⚠️ Попытка №${i + 1} не прошла: ${JSON.stringify(err.response?.data || errorMsg)}`);
      lastError = err;
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  return res.status(lastError?.response?.status || 400).json({
    error: lastError?.message,
    details: lastError?.response?.data || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
