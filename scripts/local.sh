#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Select an already-installed nvm release; never download a runtime.
node_version=$(cat .nvmrc)
node_version=${node_version#v}
if [ -x "$HOME/.nvm/versions/node/v$node_version/bin/node" ]; then
  PATH="$HOME/.nvm/versions/node/v$node_version/bin:$PATH"
  export PATH
fi
exec node scripts/local.mjs "$@"
