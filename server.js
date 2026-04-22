import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/img', express.static(join(__dirname, 'img')));


app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const AGENT_ID = process.env.RETELL_AGENT_ID;

app.post('/start-call', async (req, res) => {
  const { employee_name } = req.body;

  if (!employee_name || !employee_name.trim()) {
    return res.status(400).json({ error: 'employee_name is required' });
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        retell_llm_dynamic_variables: {
          employee_name: employee_name.trim(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to create call', detail: errorText });
    }

    const data = await response.json();
    return res.json({
      access_token: data.access_token,
      call_id: data.call_id,
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Exit Interview server running on http://localhost:${PORT}`));
