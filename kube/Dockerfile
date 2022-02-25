FROM nginx:alpine
COPY /dist/'{{APP_NAME}}' /usr/share/nginx/html
COPY /kube/default.conf /etc/nginx/conf.d/
