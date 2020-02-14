# ---- Base Image ----
ARG base=hmctspublic.azurecr.io/base/node:12-stretch-slim

FROM ${base} as base
COPY package.json yarn.lock ./
RUN export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH" \
    && yarn install --production \
    && yarn cache clean

# ---- Build Image ----
FROM base as build
COPY . .
RUN yarn install

# ---- Runtime Image ----
FROM ${base} as runtime
COPY --from=build $WORKDIR .
EXPOSE 3460
