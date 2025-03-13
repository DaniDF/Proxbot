FROM node:latest

ARG REMOTE_HOST
ARG SSH_KEY_NAME=key

COPY src/*.js /Proxbot/
COPY src/package.json /Proxbot

RUN mkdir /Proxbot-data
RUN apt-get update && apt-get upgrade -y
RUN apt-get install openssh-server -y
RUN cd /Proxbot && npm install

RUN ssh-keyscan -H "${REMOTE_HOST}" >> /root/.ssh/known_hosts
RUN echo "Host ${REMOTE_HOST}\n\tPreferredAuthentications publickey\n\tIdentityFile /ssh/${SSH_KEY_NAME}" > /root/.ssh/config

WORKDIR /Proxbot-data

CMD [ "node", "/Proxbot/main.js", "/Proxbot-data/parameter.json" ]