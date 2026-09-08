FROM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61

WORKDIR /app

COPY --chown=bun:bun public ./public
COPY --chown=bun:bun scripts/serve-static.js ./scripts/serve-static.js

USER bun
EXPOSE 8080
CMD ["bun", "./scripts/serve-static.js"]
