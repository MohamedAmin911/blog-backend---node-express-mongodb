# Blog Application API

# Vercel deployment link
https://blog-backend-node-express-mongodb.vercel.app/

Backend MVC blog API built with Express, MongoDB, Mongoose, JWT authentication, role-based authorization, groups, and ImageKit uploads.

## Project Structure

```bash
/config
/controllers
/middleware
/models
/routes
/utils
/validators
app.js
server.js
```

## Setup

1. Install packages

```bash
npm install
```

2. Create your env file

```bash
Copy-Item .env.example .env
```

3. Start the server

```bash
npm run dev
```

4. Base URL for testing

```text
https://blog-backend-node-express-mongodb.vercel.app
```

## Important Notes

- The first registered user becomes `super-admin`
- Protected routes need `Authorization: Bearer YOUR_TOKEN`
- Creating or updating post images must use `multipart/form-data`
- If Atlas SRV DNS fails on your machine, add this to `.env`

```env
DNS_SERVERS=8.8.8.8,1.1.1.1
```

## Test Flow

1. Register a user
2. Login and copy the returned token
3. Use the token in protected routes
4. Create groups and posts
5. Test update/delete permissions with different users

## Test URLs

### Health

```http
GET https://blog-backend-node-express-mongodb.vercel.app/
```

### Auth

```http
POST https://blog-backend-node-express-mongodb.vercel.app/auth/register
POST https://blog-backend-node-express-mongodb.vercel.app/auth/login
```

Register body:

```json
{
  "username": "mohamed",
  "email": "mohamed@example.com",
  "password": "Password123"
}
```

Login body:

```json
{
  "email": "mohamed@example.com",
  "password": "Password123"
}
```

### Users

```http
GET https://blog-backend-node-express-mongodb.vercel.app/users
GET https://blog-backend-node-express-mongodb.vercel.app/users/:id
POST https://blog-backend-node-express-mongodb.vercel.app/users
PATCH https://blog-backend-node-express-mongodb.vercel.app/users/:id
DELETE https://blog-backend-node-express-mongodb.vercel.app/users/:id
```

Create user body:

```json
{
  "username": "sara",
  "email": "sara@example.com",
  "password": "Password123",
  "role": "user"
}
```

Update user body:

```json
{
  "username": "sara-updated",
  "email": "sara.updated@example.com",
  "role": "admin"
}
```

### Posts

```http
GET https://blog-backend-node-express-mongodb.vercel.app/posts
GET https://blog-backend-node-express-mongodb.vercel.app/posts/:id
GET https://blog-backend-node-express-mongodb.vercel.app/posts/my-posts
GET https://blog-backend-node-express-mongodb.vercel.app/posts/user/:userId
POST https://blog-backend-node-express-mongodb.vercel.app/posts
PATCH https://blog-backend-node-express-mongodb.vercel.app/posts/:id
DELETE https://blog-backend-node-express-mongodb.vercel.app/posts/:id
```

Create post:

```http
POST https://blog-backend-node-express-mongodb.vercel.app/posts
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

Form-data fields:

- `title` = `First Post`
- `content` = `This is my first post content for testing`
- `group` = optional group id
- `images` = one or more image files

Update post text only:

```json
{
  "title": "Updated title",
  "content": "Updated content for this post"
}
```

To append new images on update, send `PATCH /posts/:id` as `multipart/form-data` with:

- `title` = optional
- `content` = optional
- `images` = one or more image files

### Groups

```http
GET https://blog-backend-node-express-mongodb.vercel.app/groups
GET https://blog-backend-node-express-mongodb.vercel.app/groups/:id
POST https://blog-backend-node-express-mongodb.vercel.app/groups
PATCH https://blog-backend-node-express-mongodb.vercel.app/groups/:id
DELETE https://blog-backend-node-express-mongodb.vercel.app/groups/:id
POST https://blog-backend-node-express-mongodb.vercel.app/groups/:id/members
DELETE https://blog-backend-node-express-mongodb.vercel.app/groups/:id/members
POST https://blog-backend-node-express-mongodb.vercel.app/groups/:id/admins
DELETE https://blog-backend-node-express-mongodb.vercel.app/groups/:id/admins
PATCH https://blog-backend-node-express-mongodb.vercel.app/groups/:id/permissions/posting
```

Create group body:

```json
{
  "name": "Node Group",
  "description": "Backend test group",
  "admins": [],
  "members": []
}
```

Update group body:

```json
{
  "name": "Node Group Updated",
  "description": "Updated description"
}
```

Add or remove members/admins body:

```json
{
  "userIds": ["USER_ID_HERE", "ANOTHER_USER_ID"]
}
```

Update posting permissions body:

```json
{
  "userIds": ["USER_ID_HERE"],
  "canPost": true
}
```

## Postman Header

For protected routes add:

```http
Authorization: Bearer YOUR_TOKEN
```

## Query Options

These list endpoints support query params:

```http
GET /users?page=1&limit=10&keyword=moh
GET /posts?page=1&limit=10&keyword=node
GET /groups?page=1&limit=10&keyword=team
GET /posts/user/:userId?page=1&limit=10
GET /posts/my-posts?page=1&limit=10
```

## Verify App Load

```bash
npm run check
```
