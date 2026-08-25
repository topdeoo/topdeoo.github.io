FROM oven/bun:1.4.0-slim@sha256:e0ee68d16ccb9927bf02aa7dd8fd4bf3369ee6d46da04faa72b05ce8bfd135f6

WORKDIR /app

COPY --chown=bun:bun public ./public
COPY --chown=bun:bun scripts/serve-static.js ./scripts/serve-static.js

USER bun
EXPOSE 8080
CMD ["bun", "./scripts/serve-static.js"]
