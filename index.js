const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

app.post('/send-max', async (req, res) => {
  let token = req.body.token ? String(req.body.token).trim() : '';
  const inputPayload = req.body.payload || {};

  if (!token || !inputPayload) {
    return res.status(400).json({ error: 'Missing token or payload' });
  }

  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  const rawId = String(inputPayload.chat_id || inputPayload.recipient_id || '').trim();
  const text = inputPayload.text || '';

  // Формируем 3 основных варианта структурирования получателя для MAX API
  const payloadVariants = [
    // Вариант А: Стандартный объект recipient (chatId)
    { recipient: { chatId: rawId }, text: text },
    // Вариант Б: Плоская передача с числовым chat_id
    { chat_id: !isNaN(rawId) ? Number(rawId) : rawId, text: text },
    // Вариант В: Передача через user_id (для каналов/групп)
    { user_id: rawId, text: text }
  ];

  let lastError = null;

  for (const payload of payloadVariants) {
    try {
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

      console.log('✅ Сообщение успешно отправлено!');
      return res.status(response.status).json(response.data);
    } catch (err) {
      console.log('⚠️ Ошибка варианта:', err.response?.data || err.message);
      lastError = err;
      // Небольшая задержка, чтобы не превысить лимит 30 req/sec
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return res.status(lastError?.response?.status || 500).json({
    error: lastError?.message,
    details: lastError?.response?.data || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
