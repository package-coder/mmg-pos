# FROM node:lts-alpine

# WORKDIR /app

# COPY package.json .
# # COPY dist .

# RUN npm install -g npm@10.8.3

# RUN node --version

# RUN npm install --force

# RUN npm run build

# RUN npm i -g serve

# COPY . .

# EXPOSE 3000-3000

# CMD [ "serve", "-s", "dist" ]

FROM node:lts-alpine

WORKDIR /app

COPY package.json .

RUN yarn

COPY . .

EXPOSE 5173

CMD ["yarn", "vite", "--host", "0.0.0.0"]
