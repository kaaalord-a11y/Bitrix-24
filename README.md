Bitrix-24

 Командный проект (MVP Интерактивной доски)
===

# 

# Репозиторий разработки веб-приложения с интерактивными досками, стикерами и совместной работой.

# 

# Структура проекта

# 

# &#x20;client/ — Frontend-приложение (React, TypeScript, HTML, CSS).

# &#x20;server/ — Backend API (Node.js, Express, PostgreSQL).

# &#x20;qa/ — Тест-кейсы, коллекции Postman и документация по тестированию.

# &#x20;docker-compose.yml — Конфигурация для быстрого локального запуска базы данных PostgreSQL.

# 

# \---

# &#x20;Быстрый старт (Локальный запуск)

# 

# &#x20;1. Клонирование репозитория

# bash

# git clone https://github.com

# cd Bitrix-24

# git checkout dev

# 

# 

# &#x20;2. Запуск базы данных (PostgreSQL)

# Для разработки не нужно устанавливать PostgreSQL вручную на компьютер. Убедитесь, что у вас запущен Docker Desktop, и выполните в корне проекта:

# bash

# docker-compose up -d

# 

# База данных поднимется на порту 5432. 

# &#x20;Строка подключения (DATABASE\_URL): postgresql://admin:rootpassword@localhost:5432/bitrix24\_mvp

# &#x20;Остановить БД: docker-compose down

# 

# &#x20;3. Запуск Backend и Frontend

# &#x20;Backend: перейдите в папку server/, создайте файл .env по образцу .env.example, установите зависимости (npm install) и запустите сервер.

# &#x20;Frontend: перейдите в папку client/, установите зависимости (npm install) и запустите проект.

# 

# \---

# 

# Правила работы с Git (Обязательно для всех!)

# 

# В репозитории настроена защита веток main и dev. Прямой git push в эти ветки заблокирован.

# 

# 1\. Актуализируйте ветку dev перед новой задачей:

# &#x20;  bash

# &#x20;  git checkout dev

# &#x20;  git pull origin dev

# &#x20;  

# 2\. Создайте свою ветку под задачу:

# &#x20;  bash

# &#x20;  git checkout -b feat/название-задачи

# &#x20;  

# &#x20;  (Примеры названий: feat/auth-jwt, feat/board-canvas, fix/login-validation)

# 3\. Пишите код только в своей директории:

# &#x20;   Фронтенд-разработчики работают в client/.

# &#x20;   Бэкенд-разработчики работают в server/.

# 4\. Не загружайте секреты:

# &#x20;   Файлы .env и папка node\_modules добавлены в .gitignore. Если добавляете новые переменные окружения, обязательно прописывайте их без паролей в .env.example.

# 5\. Сдача задачи (Pull Request):

# &#x20;   Отправьте свою ветку на GitHub:

# &#x20;    bash

# &#x20;    git push -u origin feat/название-задачи

# &#x20;    

# &#x20;   Перейдите на GitHub во вкладку Pull requests -> New pull request.

# &#x20;   Выберите слияние в ветку dev (base: dev <- compare: ваша-ветка).

# &#x20;   Дождитесь проверки (Approve) от тимлида или QA, после чего ветка будет влита в dev.

