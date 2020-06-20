# ---- Base Image ----
ARG base=hmctspublic.azurecr.io/base/node:12-alpine

FROM ${base} as base
COPY package.json yarn.lock ./
RUN yarn install --production \
    && yarn cache clean
COPY . .

EXPOSE 3460
