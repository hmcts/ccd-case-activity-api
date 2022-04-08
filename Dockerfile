# ---- Base Image ----
ARG PLATFORM=""

FROM hmctspublic.azurecr.io/base/node${PLATFORM}:14-alpine as base

USER hmcts

COPY package.json yarn.lock ./
RUN yarn install --production --network-timeout 1200000\
    && yarn cache clean
COPY . .

EXPOSE 3460
