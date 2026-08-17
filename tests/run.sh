#!/bin/sh

# Parse every .liq file in the liquidsoap repository. That repository's
# tests/snapshots/cases are the language's own corpus: they are written to cover
# parser corner cases, so tracking them keeps this grammar honest without
# maintaining a second copy of the same examples here.
#
# Set LIQUIDSOAP_DIR to test against a local checkout, e.g. an unmerged branch:
#   LIQUIDSOAP_DIR=~/src/liquidsoap ./tests/run.sh

set -e

PWD=$(dirname "$0")
BASE_DIR=$(cd "${PWD}/.." && pwd)

if [ -n "${LIQUIDSOAP_DIR}" ]; then
  SRC_DIR=$(cd "${LIQUIDSOAP_DIR}" && pwd)
else
  cd "${BASE_DIR}/tests"
  rm -rf liquidsoap
  git clone --depth=1 https://github.com/savonet/liquidsoap.git
  SRC_DIR="${BASE_DIR}/tests/liquidsoap"
fi

cd "${BASE_DIR}"

# `find`, not a shell glob: /bin/sh has no globstar, so `tests/**/*.liq` only
# reaches one directory down and silently skipped tests/snapshots/cases.
# Files deliberately not valid liquidsoap are named `.invalid-liq` and so are
# excluded by this pattern.
find "${SRC_DIR}/src" "${SRC_DIR}/tests" -name '*.liq' -print0 |
  xargs -0 npm exec tree-sitter -- parse -q -s
