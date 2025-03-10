FROM node:latest

COPY *.js /Proxbot/
COPY package.json /Proxbot

RUN mkdir /Proxbot-data
RUN apt-get update && apt-get upgrade -y
RUN apt-get install nodejs npm -y
RUN cd /Proxbot && npm install

WORKDIR /Proxbot-data

CMD [ "node", "/Proxbot/main.js", "/Proxbot-data/parameter.json" ]