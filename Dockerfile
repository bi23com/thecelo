FROM node:latest

WORKDIR /

COPY package*.json ./

RUN ls -al

COPY src/ src/

RUN ls -al

RUN npm i

COPY . .

EXPOSE 8481

CMD [ "/bin/bash -c npm run start"]

