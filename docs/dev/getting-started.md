# Getting Started

Prereqs
- Node.js >= 18

Install & Run
```bash
npm i
npm run dev
# server on :3000
```

Build & Start
```bash
npm run build
npm start
```

Tests
```bash
npm test
npm run typecheck
```

Lint/Format
```bash
npm run lint
npm run format
```

Sample API call
```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}' | jq '{cmps:(.cmps|length), trackers:(.trackers|length), events:(.events|length), leaks:(.leaks|length)}'
```

Notes
- Configure timeouts via environment variables; see `docs/config/timeouts.md`.
- For CI, see `.github/workflows/ci.yml`.
