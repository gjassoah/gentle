#!/usr/bin/env bash
# Build the site and copy it to gjasso@mictlan:~/www/experiments/gentle, served at
# https://experiments.jasso.info/gentle/, with rsync.
#   deploy.sh            build and upload
#   deploy.sh --dry-run  build and list the changes without making them
# --delete removes files on the server that are no longer in dist/.
set -euo pipefail
[ $# -eq 0 ] || [ "$*" = --dry-run ] || { echo "Usage: $0 [--dry-run]" >&2; exit 2; }

# rsync --delete empties the target of everything else, so it must be this site's own directory:
# missing, empty, or marked by an earlier deploy with a file .deploy-site holding the site's name.
check_target() {  # host directory name [--dry-run]
  local remote='d=$1 n=$2
if [ -f "$d/.deploy-site" ]; then
  [ "$(cat "$d/.deploy-site")" = "$n" ] || { echo "$d belongs to $(cat "$d/.deploy-site"), not $n; refusing to deploy." >&2; exit 1; }
elif [ ! -e "$d" ] || [ -z "$(ls -A "$d")" ]; then
  [ -n "$3" ] || { mkdir -p "$d" && echo "$n" > "$d/.deploy-site"; }
else
  echo "$d is not empty and has no .deploy-site marker; refusing to deploy." >&2; exit 1
fi'
  ssh "$1" sh -s -- "$(printf %q "$2")" "$(printf %q "$3")" ${4:+x} <<<"$remote"
}

cd "$(dirname "$0")/.."
rm -rf dist
npm run build
check_target gjasso@mictlan www/experiments/gentle gentle "${1:-}"
rsync --archive --compress --delete --delay-updates --mkpath --chmod=D755,F644 --exclude=/.deploy-site \
  --itemize-changes ${1:+"$1"} dist/ gjasso@mictlan:www/experiments/gentle/
