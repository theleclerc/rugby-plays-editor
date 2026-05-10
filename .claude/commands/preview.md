---
description: Build and serve the production bundle from Docker
---

Run the production preview:

```sh
docker compose run --rm -p 5000:5000 app sh -c "npm run build && npm run preview -- --host --port 5000"
```

The preview will be available at http://localhost:5000. Note that `npm run build` skips type-checking (`tsc --noCheck`); if you want a typecheck, run `npx tsc -b` separately.
