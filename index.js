const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

// Переменная для хранения токена бота
let globalToken = 'f9LHodD0cOJCVdaARDFpMhx5T4B5LZiSIFSXATaFliPn-ndgexawgawYR6SiATW8KWQ6g7HEa-hLcHBDhVtS';

// 1. WEBHOOK: Сюда MAX присылает сообщения из чатов, где состоит бот
app.post('/max-webhook', async (req, res) => {
  res.sendStatus(200); // Сразу отвечаем MAX, что запрос принят
  
  try {
    const data = req.body;
    console.log('📩 Входящее событие от MAX:', JSON.stringify(data));

    // Извлекаем ID чата и текст входящего сообщения
    const chatId = data.chat_id || data.message?.chat?.id || data.recipient?.chatId;
    const text = data.text || data.message?.text || '';

    // Если написали команду /id или любое другое сообщение
    if (chatId) {
      const responseText = `🤖 ID этого чата в MAX API:\n\`${chatId}\``;

      // Отправляем ответ с ID прямо в этот чат
      await axios({
        method: 'post',
        url: 'https://platform-api2.max.ru/messages',
        data: {
          chat_id: chatId,
          text: responseText
        },
        headers: {
          'Authorization': globalToken,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });
      
      console.log(`✅ ID (${chatId}) успешно отправлен в чат!`);
    }
  } catch (err) {
    console.error('❌ Ошибка обработки Webhook:', err.response?.data || err.message);
  }
});

// 2. PROXY: Эндпоинт для отправки из Google Apps Script
app.post('/send-max', async (req, res) => {
  let token = req.body.token ? String(req.body.token).trim() : globalToken;
  const inputPayload = req.body.payload || {};

  if (token) globalToken = token;

  const rawId = String(inputPayload.chat_id || '').trim();
  const text = inputPayload.text || '';

  try {
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/messages',
      data: {
        chat_id: rawId,
        text: text
      },
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    console.log(`✅ Сообщение успешно отправлено в чат ${rawId}`);
    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ Ошибка отправки:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy & Webhook running on port ${PORT}`));
