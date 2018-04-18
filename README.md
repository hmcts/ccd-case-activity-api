# ccd-case-activity-web [![Build Status](https://travis-ci.org/hmcts/ccd-case-activity-api.svg?branch=master)](https://travis-ci.org/hmcts/ccd-case-activity-api)
Real-time tracking of case activity (viewers, editors,...)

## Quickstart

```
$ git clone https://github.com/hmcts/ccd-case-activity-api.git
$ cd ccd-case-activity-web
$ yarn install
$ yarn start
```
## Setup Redis with Docker
To pull the latest docker image from docker store just type:
```
$ docker pull redis
```
After getting the latest redis you may start your redis image by the following command
```
$ docker run --name ccd-redis -p 6379:6379 -d redis
```
You can connect to redis-cli to manually execute some redis commands by connecting to the interactive terminal of your docker container.
to do this first you need to acquire the container id via the `docker ps` command:
```
fatiho@sardis:~/Documents/hmcts/ws-webstorm/ccd-case-activity-web (RDM-963/RDM-1078)$ docker ps
CONTAINER ID        IMAGE                                                           COMMAND                  CREATED             STATUS                PORTS                    NAMES
ef697aec3454        docker.artifactory.reform.hmcts.net/docker/ccd/ccd-data-store   "/entrypoint.sh --..."   13 days ago         Up 8 days (healthy)   0.0.0.0:4000->4000/tcp   ccd-data-store
e7dc23c65e51        docker.artifactory.reform.hmcts.net/docker/ccd/ccd-postgres     "docker-entrypoint..."   13 days ago         Up 8 days             0.0.0.0:5432->5432/tcp   ccd-postgres
8a1fd6f05643        redis                                                           "docker-entrypoint..."   2 weeks ago         Up 4 days             0.0.0.0:6379->6379/tcp   ccd-redis
```
Once you get the Container Id run the following command with proper container id
```
$ docker exec -it 8a1fd6f05643 /bin/bash
```
Now you are in. You can run `redis-cli` to access the Redis Command Line Interface and execute commands like GET, SET, etc. 
See [redis documentation](https://redis.io) for details

## Config

Configuration is achieved through [node-config](https://github.com/lorenwest/node-config).


## Unit tests
The tests can be run using:

```
$ yarn test
```

## End to End tests

The end to end tests require a running instance of Redis. Beware before each test all keys in Redis are removed.
The tests can be run using:

```
$ yarn test:end2end
```

## Some notes on development and test config
You need to set the NODE_ENV to make use of environment configuration and DEBUG to see the logs when you run the server
```
$ export NODE_ENV=dev
$ export DEBUG='ccd-case-activity-web:*'
$ yarn start

> ccd-case-activity-web@0.0.1 start /Users/fatiho/Documents/hmcts/ws-webstorm/ccd-case-activity-web
> node ./bin/www

  ccd-case-activity-web:app starting application with environment: dev +0ms
  ccd-case-activity-web:server Listening on port 3000 +19ms
  ccd-case-activity-web:redis-client connected to Redis +7ms
```
