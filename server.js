import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use('/img', express.static(join(__dirname, 'img')));

// ── SUPABASE ──────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── RETELL CONFIG ─────────────────────────────────────────────────────────
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const AGENT_ID       = process.env.RETELL_AGENT_ID;

// ── HELPERS ───────────────────────────────────────────────────────────────
function toSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

async function uniqueSlug(base) {
  const { data } = await supabase.from('prospects').select('id').like('id', `${base}%`);
  if (!data || data.length === 0) return base;
  const ids = new Set(data.map(r => r.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function mapProspect(row) {
  return {
    id:          row.id,
    companyName: row.company_name,
    jobTitle:    row.job_title,
    agentId:     row.agent_id,
    useCase:     row.use_case,
    status:      row.status,
    createdAt:   row.created_at,
  };
}

// ── STATIC ROUTES ─────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(join(__dirname, 'admin.html')));
app.get('/demo/:id', (req, res) => res.sendFile(join(__dirname, 'index.html')));

// ── PROSPECT ENDPOINTS ────────────────────────────────────────────────────
app.get('/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapProspect));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/prospects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Prospect not found' });
    res.json(mapProspect(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/prospects', async (req, res) => {
  const { companyName, jobTitle, agentId, useCase } = req.body;
  if (!companyName || !jobTitle || !agentId || !useCase) {
    return res.status(400).json({ error: 'companyName, jobTitle, agentId, useCase are required' });
  }
  try {
    const base = toSlug(companyName);
    const id   = await uniqueSlug(base);
    const { data, error } = await supabase
      .from('prospects')
      .insert({ id, company_name: companyName, job_title: jobTitle, agent_id: agentId, use_case: useCase, status: 'active' })
      .select().single();
    if (error) throw error;
    res.status(201).json(mapProspect(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/prospects/:id', async (req, res) => {
  const { companyName, jobTitle, agentId, useCase, status } = req.body;
  const updates = {};
  if (companyName !== undefined) updates.company_name = companyName;
  if (jobTitle    !== undefined) updates.job_title    = jobTitle;
  if (agentId     !== undefined) updates.agent_id     = agentId;
  if (useCase     !== undefined) updates.use_case     = useCase;
  if (status      !== undefined) updates.status       = status;
  try {
    const { data, error } = await supabase
      .from('prospects').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Prospect not found' });
    res.json(mapProspect(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/prospects/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('prospects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START CALL ────────────────────────────────────────────────────────────
app.post('/start-call', async (req, res) => {
  const { employee_name, prospect_id } = req.body;

  if (!employee_name || !employee_name.trim()) {
    return res.status(400).json({ error: 'employee_name is required' });
  }

  // Resolve agent ID — prospect-specific if provided, else env fallback
  let agentId = AGENT_ID;
  if (prospect_id) {
    try {
      const { data } = await supabase
        .from('prospects').select('agent_id').eq('id', prospect_id).single();
      if (data?.agent_id) agentId = data.agent_id;
    } catch (_) { /* fall back to default */ }
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        retell_llm_dynamic_variables: { employee_name: employee_name.trim() },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to create call', detail: errorText });
    }

    const data = await response.json();
    return res.json({ access_token: data.access_token, call_id: data.call_id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Exit Interview server running on http://localhost:${PORT}`));
