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

  // ВАРИАНТ 1: Передача токена через параметр query (самый надежный способ для MAX API)
  try {
    const response = await axios({
      method: 'post',
      url: `https://platform-api2.max.ru/messages?token=${encodeURIComponent(token)}`,
      data: payload,
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    console.log('✅ Успешная отправка через query token');
    return res.status(response.status).json(response.data);
  } catch (err1) {
    console.log('⚠️ Вариант 1 (Query token) не прошел:', err1.response?.data || err1.message);
  }

  // ВАРИАНТ 2: Передача токена через заголовок Authorization (без Bearer)
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

    console.log('✅ Успешная отправка через Authorization header');
    return res.status(response.status).json(response.data);
  } catch (err2) {
    console.log('⚠️ Вариант 2 (Raw Authorization header) не прошел:', err2.response?.data || err2.message);
  }

  // ВАРИАНТ 3: Стандартный Bearer
  try {
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

    console.log('✅ Успешная отправка через Bearer header');
    return res.status(response.status).json(response.data);
  } catch (err3) {
    console.error('❌ Все варианты авторизации отклонены MAX API:', err3.response?.data || err3.message);
    return res.status(err3.response?.status || 500).json({
      error: err3.message,
      details: err3.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
