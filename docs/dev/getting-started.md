# Getting Started (Dev)

## Prerequisites
- Node.js >= 18
- Chrome dependencies (Linux containers): `--no-sandbox` recommended for Cloud Run

## Install & Run
```bash
npm i
npm run dev
# server on :3000
```

## Build & Start
```bash
npm run build
npm start
```

## Tests
```bash
npm test
npm run typecheck
```

## Handy Commands
- Kill old dev server on port 3000:
```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs -r kill
```

- Sample API call:
```bash
curl -s localhost:3000/scan -H 'content-type: application/json' \
  -d '{"url":"https://example.com","autoconsentAction":"optOut"}' | jq '{cmps:(.cmps|length), trackers:(.trackers|length), events:(.events|length), leaks:(.leaks|length)}'
```
