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
  const payload = req.body.payload;

  if (!token || !payload) {
    return res.status(400).json({ error: 'Missing token or payload' });
  }

  // Очищаем токен от префикса Bearer, если он был передан
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    // Используем подтвержденный заголовок X-Max-Bot-Token
    const response = await axios({
      method: 'post',
      url: 'https://platform-api2.max.ru/messages',
      data: payload,
      headers: {
        'X-Max-Bot-Token': token,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    console.log('✅ Сообщение успешно отправлено в MAX!');
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ Ошибка ответа от MAX API:', error.response?.data || error.message);
    
    return res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
