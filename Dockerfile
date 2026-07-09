# ---------- 1단계: 빌드 ----------
FROM node:20-alpine AS build
WORKDIR /app

# 의존성 설치 (레이어 캐시 활용)
COPY package*.json ./
RUN npm install

# 소스 복사 후 프로덕션 빌드
COPY . .
RUN npm run build

# ---------- 2단계: 서빙 (nginx) ----------
FROM nginx:1.27-alpine AS runtime

# SPA 라우팅용 nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물 배치
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
