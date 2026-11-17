#!/usr/bin/env bash
# Regenerates every robustness result. Read-only against the live DB (works on a copy).
#   ./run_all.sh [workdir] [realdir]
# realdir: a directory holding live.json + calib.json of the real campaign (e.g. a run.sh workdir).
#          If omitted, it is rebuilt from colony-data/colony.db exactly as run.sh does.
# Runs per configuration can be overridden: RUNS_SCEN (2000) RUNS_SENS (500) RUNS_SCALE (1000) MONO_SCALE (1).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; SIM="$(cd "$HERE/.." && pwd)"; ROOT="$(cd "$SIM/../.." && pwd)"; C="$ROOT/client"
WORK="${1:-$(mktemp -d)}"; REAL="${2:-}"; mkdir -p "$WORK"
RUNS_SCEN="${RUNS_SCEN:-2000}"; RUNS_SENS="${RUNS_SENS:-500}"; RUNS_SCALE="${RUNS_SCALE:-1000}"; MONO_SCALE="${MONO_SCALE:-1}"
strip() { grep -v _zsh_nvm_load || true; }      # the login shell prints nvm noise; keep it out of the JSON

sed "s#CLIENT/#$C/#g" "$SIM/calib.ts" > "$WORK/calib.ts"
"$C/node_modules/.bin/esbuild" "$WORK/calib.ts" --bundle --platform=node --outfile="$WORK/calib.js" --log-level=warning
if [ -z "$REAL" ]; then
  REAL="$WORK/real"; mkdir -p "$REAL"
  cp "$ROOT/colony-data/colony.db" "$REAL/colony.db"
  python3 -I "$SIM/export.py" "$REAL/colony.db" "$REAL/live.json"
  node "$WORK/calib.js" "$REAL/live.json" 2> >(strip >&2) | strip > "$REAL/calib.json"
fi

echo "== fixtures -> $WORK/syn"
python3 -I "$HERE/fixtures.py" "$WORK/syn" "$REAL/live.json" | tee "$WORK/fixtures.txt"
for d in "$WORK"/syn/*/; do
  node "$WORK/calib.js" "$d/live.json" 2> >(strip >&2) | strip > "$d/calib.json"     # app's scoreRelationship labels
done

t0=$(date +%s)
python3 -I "$HERE/scenarios.py"    "$WORK/syn" "$REAL" "$RUNS_SCEN"  | tee "$WORK/scenarios.txt"
python3 -I "$HERE/monotonicity.py" "$WORK/syn" "$REAL" "$MONO_SCALE" | tee "$WORK/monotonicity.txt"
python3 -I "$HERE/sensitivity.py"  "$WORK/syn" "$REAL" "$RUNS_SENS"  | tee "$WORK/sensitivity.txt"
python3 -I "$HERE/scaling.py"      "$WORK/syn" "$REAL" "$RUNS_SCALE" | tee "$WORK/scaling.txt"
echo "== done in $(( $(date +%s) - t0 ))s; outputs in $WORK"
