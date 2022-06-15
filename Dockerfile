# ---- Base Image ----
FROM hmctspublic.azurecr.io/base/node:14-alpine as base

USER hmcts

COPY package.json yarn.lock ./
RUN yarn install --production \
    && yarn cache clean
COPY . .

EXPOSE 3460
