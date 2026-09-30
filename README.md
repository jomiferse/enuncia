# Enuncia

A Spanish-language app for practicing propositional logic: 40 exercises, hints, explained solutions, and mock exams.

Progress is saved in your browser. Use **Mi progreso → Exportar / Importar** to back it up or move it to another browser.

Use the sun/moon button in the header to switch themes. Your choice is saved in the browser; the initial theme follows your system settings.

## Getting started

Requirements: **Node.js 24** and **pnpm 11.20.0**.

```sh
git clone https://github.com/jomiferse/enuncia.git
cd enuncia
nvm install
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). If you don't use nvm, select Node 24 with your preferred version manager.

## Development

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Check application and test types. |
| `pnpm test` | Run the test suite. |
| `pnpm build` | Build the app into `dist/`. |
| `pnpm preview` | Preview the production build. |

## Access from another device

On the same network, start the server with:

```sh
pnpm dev --host 0.0.0.0
```

Open `http://<computer-local-ip>:5173` on the other device.

For access outside your network, keep Enuncia running and use an installed `cloudflared`:

```sh
cloudflared tunnel --url http://127.0.0.1:5173 --http-host-header localhost
```

Open the temporary URL printed by Cloudflare. Keep the computer, server, and tunnel running.

## Project structure

```text
src/app/             App setup and navigation
src/domain/          Business rules and models
src/data/            Course catalog and exercise JSON
src/features/        Screens, components, and feature hooks
src/infrastructure/  Browser storage and backups
src/shared/          Reusable components, i18n, and utilities
src/styles/          Styles and responsive layouts
```

The UI uses i18next with **Spanish only**. Translations are in `src/shared/i18n/locales/es.json`; course content is in `src/data/content/`.
