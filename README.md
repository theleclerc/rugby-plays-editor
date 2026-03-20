# Rugby Play Designer

A visual tool for designing rugby plays and formations.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine

## Getting Started
  
### 1. Start Docker Desktop

Open the **Docker Desktop** application from your Applications folder (macOS) or Start Menu (Windows). Wait until the Docker icon in your system tray/menu bar shows **"Docker Desktop is running"** before proceeding.

### 2. Start the app (Development mode)

Development mode runs the Vite dev server with hot-reload — your changes appear instantly in the browser.

```sh
docker compose up --build
```

The app will be available at **http://localhost:5000**.

To run in the background (detached mode):

```sh
docker compose up --build -d
```

### 3. Start the app (Production build)

To build and preview an optimized production bundle:

```sh
docker compose run --rm -p 5000:5000 app sh -c "npm run build && npm run preview -- --host --port 5000"
```

The production preview will be available at **http://localhost:5000**.

## Stopping the App

### Stop the dev server (foreground mode)

If the container is running in the foreground, press:

```
Ctrl + C
```

### Stop the container (detached/background mode)

```sh
docker compose down
```

This stops and removes the container and network.

### Force kill everything

```sh
docker compose kill
docker compose down
```

## Quick Reference — Docker Dev Commands

| Command | Description |
|---|---|
| `docker compose up --build` | Build image and start dev server (foreground) |
| `docker compose up --build -d` | Build image and start dev server (background) |
| `docker compose down` | Stop and remove containers |
| `docker compose kill` | Force stop running containers |
| `docker compose logs` | View container logs |
| `docker compose logs -f` | Follow/stream container logs in real time |
| `docker compose ps` | List running containers and their status |
| `docker compose exec app sh` | Open a shell inside the running container |
| `docker compose restart` | Restart the container without rebuilding |
| `docker compose up -d` | Start without rebuilding (uses cached image) |

## How It Works

- The Docker container runs a **Node.js 20 Alpine** image with the Vite dev server
- Your local source code is **mounted into the container** via a volume, so edits on your machine are reflected instantly (hot-reload)
- `node_modules` lives **inside the container only** (via an anonymous volume), keeping your local directory clean
- All app data (projects, saves) is handled **in the browser** — stopping the container does not affect your saved work

## Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot connect to the Docker daemon` | Start Docker Desktop and wait for it to be fully running |
| `port is already allocated` | Another process is using port 5000. Run `lsof -ti:5000 \| xargs kill` to free it |
| `npm install` fails in build | Delete the image and rebuild: `docker compose down --rmi all && docker compose up --build` |
| Changes not reflecting | Make sure the volume mount is working: check `docker compose logs` for errors |

## License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
