---
description: Stop dev and serve a production-parity build at localhost:5000
---

Stop any running dev container and serve the production bundle exactly as Render would. Useful for verifying that dev-only features (the `/__dev__` middleware, the dev-only Save/Load tabs, etc.) are correctly stripped from the production build.

Run these in sequence:

```sh
docker compose down
docker compose run --rm -p 5000:5000 app sh -c "npm run build && npm run preview -- --host --port 5000"
```

The first build takes ~30 seconds. The app will be at http://localhost:5000. Press Ctrl-C to exit; the next `/dev` invocation will restart hot-reload.
