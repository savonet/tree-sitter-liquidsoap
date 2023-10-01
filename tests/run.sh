#!/bin/sh

set -e

PWD=$(dirname "$0")
BASE_DIR=$(cd "${PWD}/.." && pwd)

cd "${BASE_DIR}/tests"
rm -rf liquidsoap
git clone --depth=1 https://github.com/savonet/liquidsoap.git
cd "${BASE_DIR}"
npm exec tree-sitter -- parse -q -s tests/liquidsoap/src/libs/**/*.liq tests/liquidsoap/tests/**/*.liq
