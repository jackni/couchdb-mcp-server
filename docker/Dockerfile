FROM node:lts-bullseye AS build

WORKDIR /app

COPY ./app /app

RUN npm i 
RUN npm run build

FROM node:alpine3.22 AS runtime
 RUN apk update && \
      apk upgrade

WORKDIR /app
COPY --from=build /app/package*.json /app/
RUN npm ci --only=production
COPY --from=build /app/dist /app/

COPY docker/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3008

ENTRYPOINT ["/app/docker-entrypoint.sh"]
# EXPOSE 22
# keep code session alive
# CMD ["sh"]

