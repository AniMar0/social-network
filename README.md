# social-network

## Overview
This project is a Facebook-like social network application built with Go (backend) and Next.js (frontend).  
It includes features such as followers, profiles, posts, groups, notifications, and chat with realtime updates.

---

## Project Objectives
- **Followers**: follow/unfollow users, handle follow requests, support public/private profiles.
- **Profile**: display user info, activity, posts, followers/following lists.
- **Posts**: create posts and comments with image/GIF support, set privacy levels.
- **Groups**: create groups, invite users, group posts/comments, group events.
- **Notifications**: show all notifications with realtime updates.
- **Chat**: private messages with Websockets, seen/read receipts, emojis, group chat.
- **Authentication**: registration, login, sessions & cookies.
- **Frontend**: responsive UI with messages, notifications, sidebar, search, avatars.
- **Backend**: Go server, database management, migrations, Docker setup.

---

## Current Progress

| Feature / Part             | Progress | Notes |
|-----------------------------|----------|-------|
| **Followers**              | ✅ 100%  | Follow/unfollow, accept/decline requests, public profile auto-follow ✅ |
| **Profile**                | ✅ 100%  | Display info, activity, posts, followers/following lists, public/private toggle ✅ |
| **Posts**                  | ✅ 100%   | Create posts ✅, include images/GIF ✅, privacy settings ✅, create comments ✅ |
| **Groups**                 | ❌ 0%    | Everything remaining: create group, invitations, group posts/comments, events ❌ |
| **Notifications**          | ✅ 100%  | All types of notifications implemented, UI and realtime updates ✅ |
| **Chat (Private + Group)** | ⚠️ 75% | Private messages, seen/read receipts, emojis ✅, group chat ❌ |
| **Authentication & Sessions** | ✅ 100% | Registration/login, sessions & cookies ✅ |
| **Frontend**               | ⚠️ 90%   | Messages UI, notifications UI, sidebar/search/avatar ✅, group UI ❌ |
| **Backend (Server & DB)**  | ⚠️ 90%  | Go server, Websockets, DB tables, migrations ✅, Docker setup ❌ |

**Overall Project Progress ≈ 83% ✅**

---

## Tech Stack
- **Backend**: Go, Gorilla Websocket, SQLite, golang-migrate
- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: SQLite3
- **Deployment**: Docker (frontend & backend containers)
- **Authentication**: Sessions & cookies
- **Other**: bcrypt, uuid libraries

---

## Next Steps
1. Complete **Posts** (create comments)  
2. Implement **Groups** (all features: create, invite, posts, events)  
3. Finish **Chat** group chat functionality  
4. Improve **Frontend** responsive design  
5. Setup **Docker** containers for backend & frontend  

---

