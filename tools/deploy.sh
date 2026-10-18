#!/usr/bin/env bash
# Build the site and copy it to gjasso@mictlan:~/gentle, served at https://experiments.jasso.info/gentle/.
# scp only adds or overwrites files; files removed from the site must be deleted on the server by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
npm run build
scp -r dist/. gjasso@mictlan:gentle/
