#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    echo 'Usage: ./backup.sh

This script backs up UnfareSF SQLite DBs to a MinIO bucket.

Instead of copying the live database files directly (which can produce a
torn/corrupt backup, since the app writes them in WAL mode), it first
takes a consistent snapshot of every *.db file with SQLite`s VACUUM INTO.
VACUUM INTO runs inside a single read transaction, so it never blocks the
app from reading or writing, and it emits a single clean file with no
-wal/-shm sidecars. The snapshots are then uploaded to MinIO.

Environment:
  DBS_DIR             Directory holding the live *.db files (default: /app/dbs)
  BACKUP_STAGING_DIR  Base directory under which a fresh, unique staging dir is
                      created (and auto-removed on exit). Point this at a volume
                      with free space >= the largest DB (the GTFS DB is ~1GB).
                      Defaults to TMPDIR or /tmp.
  MINIO_BACKUPS_ACCESS_KEY / MINIO_BACKUPS_SECRET_KEY  MinIO credentials.
'
  exit
fi

cd "$(dirname "$0")"

DBS_DIR="${DBS_DIR:-/app/dbs}"

# Always stage snapshots in a fresh unique dir that WE create, and remove only
# that dir on exit. If BACKUP_STAGING_DIR is set it is used as the *base* the
# unique dir is created under -- so cleanup can never rm a caller-supplied dir
# (or the DBs) even if BACKUP_STAGING_DIR points at DBS_DIR.
STAGING_BASE="${BACKUP_STAGING_DIR:-${TMPDIR:-/tmp}}"
mkdir -p "$STAGING_BASE"
STAGING="$(mktemp -d -p "$STAGING_BASE" unfaresf-backup.XXXXXX)"
trap 'rm -rf "$STAGING"' EXIT

main() {
  # Take a consistent, non-blocking snapshot of each SQLite DB.
  # VACUUM INTO reads the source in one read transaction (safe against a live,
  # WAL-mode DB) and writes a single clean file -- no -wal/-shm sidecars.
  # Snapshots land outside DBS_DIR, so they are never re-read as source DBs.
  local db count=0
  for db in "$DBS_DIR"/*.db; do
    [[ -e "$db" ]] || continue   # no matches -> glob stays literal; skip it
    echo "Snapshotting $(basename "$db")..."
    sqlite3 "$db" "VACUUM INTO '$STAGING/$(basename "$db")'"
    count=$((count + 1))
  done

  if [[ "$count" -eq 0 ]]; then
    echo "No *.db files found in $DBS_DIR; nothing to back up." >&2
    exit 1
  fi

  set +o history
  mc alias set spring-lake https://minio.unfaresf.org "${MINIO_BACKUPS_ACCESS_KEY-}" "${MINIO_BACKUPS_SECRET_KEY-}";
  set -o history

  echo "Uploading $count snapshot(s) to MinIO..."
  mc cp --recursive "$STAGING/" spring-lake/backups/unfaresf/dbs/;
}

main "$@"
