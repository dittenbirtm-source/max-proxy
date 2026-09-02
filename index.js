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

  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  // 1. Способ через Query-параметр (основной для Bot API MAX)
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

    console.log('✅ Сообщение отправлено (Query token)');
    return res.status(response.status).json(response.data);
  } catch (errQuery) {
    console.log('⚠️ Ошибка Query token:', errQuery.response?.data || errQuery.message);
  }

  // 2. Способ через Authorization без Bearer
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

    console.log('✅ Сообщение отправлено (Raw Authorization header)');
    return res.status(response.status).json(response.data);
  } catch (errAuth) {
    console.error('❌ Ошибка Authorization header:', errAuth.response?.data || errAuth.message);
    return res.status(errAuth.response?.status || 500).json({
      error: errAuth.message,
      details: errAuth.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
