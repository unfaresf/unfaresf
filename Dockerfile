ARG NODE_VERSION=22.13.0
FROM node:${NODE_VERSION}-slim AS base
ARG PORT=3000
WORKDIR /src

FROM base AS build
COPY --link package.json package-lock.json .
RUN npm install
COPY --link . .
RUN npm run build

FROM base
ENV PORT=$PORT
ENV NODE_ENV=production
COPY --from=build /src/.output /src/.output
# Optional, only needed if you rely on unbundled dependencies
# COPY --from=build /src/node_modules /src/node_modules

CMD [ "node", ".output/server/index.mjs" ]