FROM oven/bun:1.3.14-slim@sha256:d56a2534ffd262e92c12fd3249d3924d296d97086da773f821d7d0477435ea04

WORKDIR /app

COPY --chown=bun:bun public ./public
COPY --chown=bun:bun scripts/serve-static.js ./scripts/serve-static.js

USER bun
EXPOSE 8080
CMD ["bun", "./scripts/serve-static.js"]
