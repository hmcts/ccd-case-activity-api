ARG PLATFORM=""
FROM hmctspublic.azurecr.io/base/node${PLATFORM}:20-alpine AS base

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

USER root
RUN corepack enable
RUN apk update \
  && apk add bzip2 patch python3 py3-pip make gcc g++ \
  && rm -rf /var/lib/apt/lists/* \
  && export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"

COPY --chown=hmcts:hmcts package.json yarn.lock ./

USER hmcts
COPY --chown=hmcts:hmcts app.js server.js ./
COPY --chown=hmcts:hmcts app ./app
COPY --chown=hmcts:hmcts config ./config

RUN yarn install --network-timeout 1200000

# ---- Build Image ----
FROM base AS build

RUN sleep 1 && yarn install --network-timeout 1200000 && yarn cache clean

# ---- Runtime Image ----
FROM hmctspublic.azurecr.io/base/node${PLATFORM}:20-alpine AS runtime
COPY --from=build $WORKDIR .

EXPOSE 3460
