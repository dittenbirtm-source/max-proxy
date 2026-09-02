const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

// Отключение проверки SSL для API MAX
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

// Токен считывается из переменных окружения Render
const globalToken = process.env.MAX_BOT_TOKEN || '';

// ==========================================
// 1. УСТАНОВКА ВЕБХУКА
// ==========================================
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

// ==========================================
// 2. ВХОДЯЩИЕ ВЕБХУКИ ОТ MAX API
// ==========================================
app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log('📩 Входящие данные от MAX:', JSON.stringify(req.body));
  } catch (err) {
    console.error('❌ Ошибка при получении Webhook:', err.message);
  }
});

// ==========================================
// 3. УНИВЕРСАЛЬНАЯ ОТПРАВКА СООБЩЕНИЙ
// ==========================================
app.post('/send-max', async (req, res) => {
  const token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  const rawId = String(inputPayload.chat_id || inputPayload.chatId || '').trim();
  const text = inputPayload.text || '';

  // Очистка ID от лишних символов для формирования альтернативных вариантов
  const cleanId = rawId.replace('-', '').replace('@chat.agent', '').replace('@channel', '');

  // Перебор всех форматов адресации MAX / VK Teams API
  const attempts = [
    { chat_id: rawId, text: text },                         // Как передано (-71997730303397)
    { chat_id: `${cleanId}@chat.agent`, text: text },       // Групповой чат с суффиксом @chat.agent
    { channel_id: rawId, text: text },                      // Канал (channel_id)
    { channel_id: cleanId, text: text },                    // Канал без минуса
    { user_id: rawId, text: text },                         // Личный диалог (user_id)
    { chat_id: Number(cleanId), text: text }               // Численный ID
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
      console.log(`⚠️ Попытка №${i + 1} не прошла: ${errorMsg}`);
      lastError = err;
      
      // Небольшая задержка перед следующей попыткой
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
