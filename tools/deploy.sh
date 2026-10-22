#!/usr/bin/env bash
# Build the site and copy it to gjasso@mictlan:~/www/experiments/gentle, served at
# https://experiments.jasso.info/gentle/, with rsync.
#   deploy.sh            build and upload
#   deploy.sh --dry-run  build and list the changes without making them
# --delete removes files on the server that are no longer in dist/.
set -euo pipefail
[ $# -eq 0 ] || [ "$*" = --dry-run ] || { echo "Usage: $0 [--dry-run]" >&2; exit 2; }
cd "$(dirname "$0")/.."
rm -rf dist
npm run build
rsync --archive --compress --delete --delay-updates --mkpath --chmod=D755,F644 \
  --itemize-changes ${1:+"$1"} dist/ gjasso@mictlan:www/experiments/gentle/
