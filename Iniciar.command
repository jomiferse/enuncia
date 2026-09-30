#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Use the desktop runtime when the Node on PATH is too old for Vite.
if ! node -e 'if((Number(process.versions.node.split(".")[0]) < 22 || (Number(process.versions.node.split(".")[0]) === 22 && Number(process.versions.node.split(".")[1]) < 12))) process.exit(1)' 2>/dev/null; then
  runtime_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [[ -x "$runtime_node/node" ]]; then export PATH="$runtime_node:$PATH"; fi
fi
if ! node -e 'if((Number(process.versions.node.split(".")[0]) < 22 || (Number(process.versions.node.split(".")[0]) === 22 && Number(process.versions.node.split(".")[1]) < 12))) process.exit(1)' 2>/dev/null; then
  print 'Necesitas Node.js 22.12 o posterior para iniciar el proyecto.'
  read '?Pulsa Intro para cerrar…'
  exit 1
fi
if [[ ! -d node_modules ]]; then npm install; fi
if curl -fsS http://127.0.0.1:5173/ 2>/dev/null | grep -Fq '<title>Enuncia</title>'; then
  open http://127.0.0.1:5173/
  print 'Enuncia ya está abierta en http://127.0.0.1:5173/'
  exit 0
fi
npm run dev &
logic_server_pid=$!
trap 'kill "$logic_server_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..30}; do
  if ! kill -0 "$logic_server_pid" 2>/dev/null; then wait "$logic_server_pid"; exit 1; fi
  if curl -fsS http://127.0.0.1:5173/ 2>/dev/null | grep -Fq '<title>Enuncia</title>'; then
    open http://127.0.0.1:5173/
    print 'Web abierta. Mantén esta ventana abierta. Para detenerla, pulsa Control+C.'
    wait "$logic_server_pid"
    exit 0
  fi
  sleep 1
done
print 'No se ha podido abrir la web. Comprueba los mensajes de esta ventana.'
exit 1
