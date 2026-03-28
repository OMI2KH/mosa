# ==========================
# 1️⃣ Base Image
# ==========================
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# ==========================
# 2️⃣ Install Dependencies
# ==========================
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ==========================
# 3️⃣ Copy App Files
# ==========================
COPY . .

# ==========================
# 4️⃣ Build (if using TypeScript or build step)
# ==========================
# Uncomment if you have a build command (like TypeScript or Next.js)
# RUN yarn build

# ==========================
# 5️⃣ Generate Prisma Client
# ==========================
RUN npx prisma generate

# ==========================
# 6️⃣ Expose Port & Start App
# ==========================
EXPOSE 5001

CMD ["yarn", "start"]
