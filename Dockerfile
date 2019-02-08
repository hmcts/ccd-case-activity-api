FROM hmcts.azurecr.io/hmcts/base/node/stretch-slim-lts-8 as base

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN curl -o- -L https://yarnpkg.com/install.sh | bash -s \
    && export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH" \
    && yarn install --production \
    && yarn cache clean


COPY app.js server.js ./
COPY app ./app
COPY config ./config

ENV PORT 3460

HEALTHCHECK --interval=10s \
    --timeout=10s \
    --retries=10 \
    CMD http_proxy="" curl --silent --fail http://localhost:3460/health

EXPOSE 3460
CMD [ "yarn", "start" ]
