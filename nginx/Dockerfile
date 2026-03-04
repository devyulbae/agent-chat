FROM nginx:alpine
RUN apk add --no-cache apache2-utils
COPY default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint-auth.sh /docker-entrypoint-auth.sh
RUN chmod +x /docker-entrypoint-auth.sh
ENTRYPOINT ["/docker-entrypoint-auth.sh"]
