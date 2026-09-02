const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(express.json());

// Отключаем строгую проверку SSL-цепочки для корректной работы с сертификатами Минцифры
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

app.post('/send-max', async (req, res) => {
  const { token, payload } = req.body;

  if (!token || !payload) {
    return res.status(400).json({ error: 'Missing token or payload' });
  }

  try {
    const response = await axios.post('https://platform-api2.max.ru/messages', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
