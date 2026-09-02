const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

// Игнорируем проблемы с цепочкой SSL-сертификатов
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

app.post('/send-max', async (req, res) => {
  let token = req.body.token ? String(req.body.token).trim() : '';
  const payload = req.body.payload;

  if (!token || !payload) {
    return res.status(400).json({ error: 'Missing token or payload' });
  }

  // Очищаем токен от префикса Bearer, если он был передан случайно
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    // Отправляем запрос в MAX API с явной передачей Bearer-токена
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/messages',
      data: payload,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('MAX API Error:', error.response?.data || error.message);
    
    // Попытка №2: Передача токена через заголовок X-Bot-Token (если Bearer отклоняется)
    try {
      const fallbackResponse = await axios({
        method: 'post',
        url: 'https://platform-api2.max.ru/messages',
        data: payload,
        headers: {
          'X-Bot-Token': token,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });
      return res.status(fallbackResponse.status).json(fallbackResponse.data);
    } catch (fallbackErr) {
      return res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data || null
      });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
