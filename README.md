# Social Network Project

A Facebook-like social network application built with **Go** (backend) and **Next.js** (frontend).  
This project demonstrates a full-stack web application with realtime features, user authentication, and a responsive UI.

---

## 🚀 Features

### User Management

- Registration, login, and authentication (sessions & cookies)
- Public/private profiles
- Follow/unfollow users
- Handle follow requests

### Posts & Comments

- Create posts with text, images, or GIFs
- Comment on posts
- Set post privacy (public/private/friends)
- Like and reply to comments

### Groups

- Create and join groups
- Group posts and comments
- Group events (UI only for now)

### Chat

- Private messaging using WebSockets
- Seen/read receipts
- Emojis support
- Group chat

### Notifications

- Realtime notifications
- Mark as read/unread

### Frontend

- Responsive design
- Sidebar for navigation
- Search users & posts
- Avatars & user activity indicators

### Backend

- Go server with clean architecture
- SQLite database (with migrations)
- RESTful APIs

---

## 🛠 Tech Stack

- **Backend:** Go, Gorilla WebSocket, SQLite
- **Frontend:** Next.js, React, Tailwind CSS
- **Realtime:** WebSockets

---

## 📦 Getting Started

### Prerequisites

- Go >= 1.20
- Node.js >= 18

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AniMar0/social-network.git
   cd social-network
   ```

2. **Setup backend:**

   ```bash
   cd backend
   go mod tidy
   go run main.go
   ```

3. **Setup frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the app:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8080](http://localhost:8080)

---

## 📝 Database & Migrations

- **Database:** SQLite
- **Migrations:** Go scripts in `backend/migrations`

To apply migrations:

```bash
go run backend/migrations/main.go
```

---

## 📁 Project Structure

```
backend/                  # Go backend
├─ go.mod
├─ go.sum
├─ main.go
├─ pkg/
│  ├─ tools.go
│  ├─ api/
│  │  ├─ Auth.go
│  │  ├─ Comments.go
│  │  ├─ Follow.go
│  │  ├─ Messages.go
│  │  ├─ Notification.go
│  │  ├─ Objects.go
│  │  ├─ Post.go
│  │  ├─ Profile.go
│  │  ├─ server.go
│  │  ├─ User.go
│  │  └─ WebSocket.go
│  └─ db/
│     ├─ migrations/
│     │  ├─ app.db
│     │  └─ sqlite/
│     │     ├─ *.sql
│     └─ sqlite/
│        └─ sqlite.go
├─ uploads/
│  ├─ default.jpg
│  ├─ Avatars/
│  ├─ Messages/
│  └─ Posts/

frontend/                 # Next.js frontend
├─ .gitignore
├─ components.json
├─ eslint.config.mjs
├─ LICENSE
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ tsconfig.json
├─ public/
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ src/
│  ├─ app/
│  │  ├─ ClientRoot.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ 404/
│  │  ├─ auth/
│  │  ├─ explore/
│  │  ├─ groups/
│  │  ├─ messages/
│  │  ├─ notifications/
│  │  └─ profile/
│  ├─ components/
│  │  ├─ account-settings.tsx
│  │  ├─ auth.tsx
│  │  ├─ explore.tsx
│  │  ├─ group-chat.tsx
│  │  ├─ groups.tsx
│  │  ├─ home.tsx
│  │  ├─ messages.tsx
│  │  ├─ newpost.tsx
│  │  ├─ notifications.tsx
│  │  ├─ sidebar.tsx
│  │  ├─ user-profile.tsx
│  │  └─ ui/
│  ├─ config/
│  │  └─  site.config.ts # config your site domain,name...
│  ├─ lib/
│  │  ├─ navigation.ts
│  │  ├─ notifications.ts
│  │  ├─ tools.ts
│  │  ├─ utils.ts
│  │  └─ websocket.ts
```

---

## 💡 Future Improvements

- Full backend support for groups and events
- Image/video uploads for posts
- Advanced search & filters
- Mobile app version
- Docker setup for easier deployment

---

## 📝 License

MIT License

---
