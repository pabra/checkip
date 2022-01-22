# use node:lts-alpine
ARG BASE_IMAGE=node:16.13.2-alpine

FROM ${BASE_IMAGE} AS builder

WORKDIR /app

COPY package.json \
    package-lock.json  \
    ./

RUN npm install

COPY tsconfig.json \
    .prettierrc.js \
    .eslintrc.js \
    ./
# COPY __tests__ __tests__/
COPY src src/
COPY assets assets/

RUN npm run test \
    && npm run build


FROM ${BASE_IMAGE}

WORKDIR /app

COPY --from=builder /app/package.json \
                    /app/package-lock.json \
                    ./
RUN NODE_ENV=production npm install
COPY --from=builder /app/dist dist/
COPY --from=builder /app/assets assets/

RUN NODE_ENV=production npm install -g

USER nobody

ENTRYPOINT [ "node", "dist/src/index.js" ]
