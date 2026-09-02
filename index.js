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
  
  // Универсальное извлечение параметров (как из плоской структуры, так и из payload)
  const payload = req.body.payload || {};
  const rawId = req.body.chat_id || payload.chat_id || payload.chatId || '';
  const text = req.body.text || payload.text || payload.body?.text || payload.message || '';

  // Защита от отправки пустых запросов
  if (!rawId || !text) {
    console.error(`❌ Валидация не пройдена: chat_id="${rawId}", text_length=${text ? text.length : 0}`);
    return res.status(400).json({ 
      error: 'Empty chat_id or text', 
      received: { chat_id: rawId, text: text } 
    });
  }

  const strId = String(rawId);
  const numId = !isNaN(Number(rawId)) ? Number(rawId) : rawId;

  // Набор проверенных вариантов запроса
  const attempts = [
    // 1. Прямой работающий метод через URL parameter
    {
      url: `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(strId)}`,
      data: { body: { text: text }, text: text }
    },
    // 2. Стандартный метод через recipient объект (строковый ID)
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { recipient: { chat_type: 'chat', chat_id: strId }, body: { text: text } }
    },
    // 3. Через recipient объект (числовой ID)
    {
      url: 'https://platform-api2.max.ru/messages',
      data: { recipient: { chat_type: 'chat', chat_id: numId }, body: { text: text } }
    }
  ];

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const item = attempts[i];
    try {
      console.log(`[Попытка ${i + 1}/${attempts.length}] URL: ${item.url}`);
      
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
