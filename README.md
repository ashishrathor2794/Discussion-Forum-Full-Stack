# Discussion Forum — Full Stack Development Project

A Reddit/Stack Overflow-style discussion forum built with React, Node.js, Express, MongoDB, JWT and Socket.IO.

## Features
- User registration and login
- JWT authentication
- Create, read and delete discussion threads
- Replies/comments
- Upvote/downvote threads
- Accepted answers
- Search and pagination
- User / Moderator / Admin roles
- Real-time notifications with Socket.IO
- Email notification hook with Nodemailer
- Responsive UI

## Tech Stack
Frontend: React + Vite + Axios + React Router
Backend: Node.js + Express + Mongoose + JWT + Socket.IO + Nodemailer
Database: MongoDB Atlas

## Setup

### Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/discussion_forum
JWT_SECRET=change_this_to_a_long_random_secret
CLIENT_URL=http://localhost:5173
EMAIL_USER=
EMAIL_PASS=
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo roles
The first registered account is a normal user. For moderator/admin testing, change the user's `role` in MongoDB to `moderator` or `admin`.

## Deployment
- Backend: Render
- Frontend: Vercel
- Set `VITE_API_URL` in the frontend deployment to the deployed backend URL.
- Set `CLIENT_URL` in Render to the deployed Vercel URL.
- Set the same MongoDB Atlas connection string in Render.
