# Exit Interview Prototype

AI-powered exit interview agent UI — connects to a Retell voice agent via web call API.

## Project Structure

```
exit-interview/
  client/
    index.html        ← Complete frontend (single file, all screens)
  server/
    server.js         ← Express server (Retell API calls)
    package.json
    .env.example      ← Copy to .env and fill in your keys
```

## Setup

### 1. Configure your Retell agent
In your Retell dashboard → Conversation Flow:
- Replace any hardcoded name (e.g. "Thomas") with `{{employee_name}}`
- Set a default value of `Thomas` as fallback under agent settings → Dynamic Variables

### 2. Set up the server
```bash
cd server
cp .env.example .env
# Edit .env — add your RETELL_API_KEY and RETELL_AGENT_ID
npm install
npm start
```
Server runs on http://localhost:3001

### 3. Open the client
Open `client/index.html` directly in a browser, or serve it:
```bash
cd client
npx serve .
```
Open http://localhost:3000

### 4. Test
- Enter a name on the entry screen
- Proceed through mic check
- Click "Start Interview" — the call connects via Retell
- The agent should greet using the name you entered

## Environment Variables

| Variable | Description |
|---|---|
| `RETELL_API_KEY` | From Retell dashboard → API Keys |
| `RETELL_AGENT_ID` | From Retell dashboard → your exit interview agent |
| `PORT` | Server port (default: 3001) |

## Screens

1. **Entry** — Name input, privacy note, proceed CTA
2. **Setup** — Mic check + interview tips tabs, proceed CTA
3. **Interview** — Dark visualizer, live transcript panel, end interview
4. **Feedback** — Star rating questions
5. **Thank you** — Confirmation screen

## Notes

- Server must be running before starting an interview
- Browser must be on `localhost` or `https` for mic access
- Access tokens expire 30s after creation — always trigger on button click, never pre-register
