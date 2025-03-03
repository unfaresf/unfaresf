ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base
ARG PORT=3000
ARG TARGETARCH
WORKDIR /src
RUN apt-get update && apt-get install -y curl
RUN curl https://dl.min.io/client/mc/release/linux-${TARGETARCH}/mc --create-dirs -o /usr/local/bin/mc
RUN chmod +x /usr/local/bin/mc

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

CMD [ "npm", "run", "start" ]