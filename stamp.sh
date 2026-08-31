#!/bin/bash
# Stamp site.css's content hash onto every stylesheet link so a deploy always
# busts the browser cache.
#
# WHY THIS EXISTS: GitHub Pages serves site.css with `cache-control: max-age=600`
# and no version in the URL. On 2026-08-31 a type-scale change went live and
# correct, and Brandon's browser kept serving the old stylesheet - so the fix
# looked like it had not been applied at all. The server was right and the
# screenshot was stale. Run this before every commit that touches site.css.
set -euo pipefail
cd "$(dirname "$0")"
H=$(shasum -a 256 site.css | cut -c1-10)
find . -name '*.html' -not -path './.git/*' -print0 |
  xargs -0 sed -i '' -E "s|href=\"/site\.css(\?v=[a-f0-9]+)?\"|href=\"/site.css?v=$H\"|g"
echo "stamped site.css?v=$H onto $(grep -rl "site.css?v=$H" --include='*.html' . | wc -l | tr -d ' ') files"
