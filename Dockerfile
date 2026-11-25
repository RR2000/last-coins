# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build

FROM nginx:1.29-alpine
# public JSON-RPC nodes, no API key; override both to use your own (they also end up in the CSP)
ENV BSC_RPC_URL=https://bsc-rpc.publicnode.com \
    ETH_RPC_URL=https://ethereum-rpc.publicnode.com \
    NGINX_ENVSUBST_FILTER=_RPC_URL
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
