#!/bin/sh
set -eu

database_path="${DATABASE_PATH:-/data/animeverse.db}"
data_dir="$(dirname "$database_path")"
mkdir -p "$data_dir"

if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$data_dir"
  exec su-exec node "$@"
fi

exec "$@"
