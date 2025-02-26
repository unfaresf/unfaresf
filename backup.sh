#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    echo 'Usage: ./backup.sh

This script backsup UnfareSF DBs to MinIO bucket.
'
  exit
fi

cd "$(dirname "$0")"

main() {
  set +o history
  mc alias set spring-lake https://minio.unfaresf.org "${MINIO_BACKUPS_ACCESS_KEY-}" "${MINIO_BACKUPS_SECRET_KEY-}";
  set -o history
  mc cp --recursive /app/dbs/ spring-lake/backups/unfaresf/dbs/;
}

main "$@"
