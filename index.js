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

  // Очищаем токен
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  // Массив различных вариантов формирования заголовков и путей API MAX
  const attempts = [
    {
      name: 'Standard Bearer',
      url: 'https://platform-api2.max.ru/messages',
      headers: { 'Authorization': `Bearer ${token}` }
    },
    {
      name: 'X-Max-Bot-Token Header',
      url: 'https://platform-api2.max.ru/messages',
      headers: { 'X-Max-Bot-Token': token }
    },
    {
      name: 'Bot-Token Header',
      url: 'https://platform-api2.max.ru/messages',
      headers: { 'Bot-Token': token }
    },
    {
      name: 'Bots endpoint Bearer',
      url: 'https://platform-api2.max.ru/bots/messages',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  ];

  let lastError = null;

  for (const config of attempts) {
    try {
      console.log(`[Attempting]: ${config.name}`);
      const response = await axios({
        method: 'post',
        url: config.url,
        data: payload,
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });

      console.log(`✅ Success via ${config.name}`);
      return res.status(response.status).json(response.data);
    } catch (err) {
      console.log(`❌ Failed ${config.name}:`, err.response?.data || err.message);
      lastError = err;
    }
  }

  return res.status(lastError?.response?.status || 500).json({
    error: lastError?.message,
    details: lastError?.response?.data || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
