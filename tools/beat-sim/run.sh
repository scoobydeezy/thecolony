#!/usr/bin/env bash
# Reproduces the BOARD-GAME-REVIEW.md numbers. Read-only against the live DB (works on a copy).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"; C="$ROOT/client"
WORK="${1:-$(mktemp -d)}"; mkdir -p "$WORK"
cp "$ROOT/colony-data/colony.db" "$WORK/colony.db"
python3 -I "$HERE/export.py" "$WORK/colony.db" "$WORK/live.json"
{ echo "import * as T from '$C/src/app/core/models/types';"
  echo "import { FactionInfluenceService } from '$C/src/app/core/services/faction-influence.service';"
  echo "const { DEFAULT_BELIEF_AXIS_LABELS, DEFAULT_FORMULAS, DEFAULT_CASCADE_RULES, FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS, computeFactionInfluence, computeFactionPower } = T as any;"
  echo "type ColonyState=any;type Faction=any;type Character=any;type Session=any;type RulesConfig=any;type Asset=any;type FactionGoal=any;type Location=any;type ColonySnapshot=any;type CharacterState=any;type AssetStatus=any;type GoalStatus=any;type LocationState=any;type GeometryType=any;type DerivedEffect=any;type BeliefAxisLabels=any;type BeliefAxisConfig=any;type FormulasConfig=any;type CascadeRule=any;type StressTrigger=any;"
  # verbatim copy of the snapshot accumulator; update the line range if app.store.ts moves
  sed -n '105,795p' "$C/src/app/store/app.store.ts"
  cat "$HERE/harness-tail.ts"; } > "$WORK/harness.ts"
"$C/node_modules/.bin/esbuild" "$WORK/harness.ts" --bundle --platform=node --outfile="$WORK/harness.js" --log-level=warning
node "$WORK/harness.js" "$WORK/live.json" > "$WORK/harness_out.json"
echo "== Real app snapshot replay: $WORK/harness_out.json"
python3 -I "$HERE/driver.py" "$WORK"

# ---- Revision 2 calibration (baseline world) ----
sed "s#CLIENT/#$C/#g" "$HERE/calib.ts" > "$WORK/calib.ts"
"$C/node_modules/.bin/esbuild" "$WORK/calib.ts" --bundle --platform=node --outfile="$WORK/calib.js" --log-level=warning
node "$WORK/calib.js" "$WORK/live.json" | grep -v _zsh_nvm_load > "$WORK/calib.json"
python3 -I "$HERE/experiments.py" "$WORK"
python3 -I "$HERE/experiments2.py" "$WORK"
python3 -I "$HERE/experiments3.py" "$WORK"

# ---- Revision 3 configuration (+ belief-threshold 0.4 sensitivity) ----
mkdir -p "$WORK/t04"; cp "$WORK/live.json" "$WORK/t04/"
node "$WORK/calib.js" "$WORK/live.json" 0.4 | grep -v _zsh_nvm_load > "$WORK/t04/calib.json"
python3 -I "$HERE/experiments4.py" "$WORK" "$WORK/t04"

# ---- Revision 4 candidates (monotone People, cast-scaled draws, unattended resolution, Reading branches) ----
python3 -I "$HERE/experiments5.py" "$WORK"

# ---- Revision 5 (bounded Character Beats, starvation). Needs the synthetic worlds from robustness/run_all.sh:
#   SYN_DIR=<robustness workdir>/syn ./run.sh
if [ -n "${SYN_DIR:-}" ]; then python3 -I "$HERE/experiments6.py" "$WORK" "$SYN_DIR"; fi
