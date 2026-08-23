FROM nginx:alpine

# Удаляем дефолтный конфиг Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем наш конфиг для SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный проект (папка dist, которую сгенерирует Woodpecker)
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]