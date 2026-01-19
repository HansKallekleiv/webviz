ARG NODE_TAG="18.20.8-alpine@sha256:929b04d7c782f04f615cf785488fed452b6569f87c73ff666ad553a7554f0006"
ARG NGINX_TAG="1.23-alpine@sha256:b5fe08305969d68f9d44309ea30f02a7dfbefe6e429f8c3f3f348fa45600f8b2"

###########################################
# Build documentation assets              #
###########################################

FROM node:${NODE_TAG} AS builder

USER node

COPY --chown=node:node ./documentation /usr/src/app/documentation

WORKDIR /usr/src/app/documentation
ENV NODE_ENV=production

RUN npm ci && npm run build

############################################################
# Final image - serve static files with nginx              #
############################################################

FROM nginxinc/nginx-unprivileged:${NGINX_TAG}

COPY --from=builder /usr/src/app/documentation/.vitepress/dist /usr/share/nginx/html
COPY ./documentation/nginx.conf /etc/nginx/nginx.conf

# What we really want to use here is $UID - however Radix requires it to be explicit in order to recognize non-root Docker image:
USER 101

CMD ["nginx"]
