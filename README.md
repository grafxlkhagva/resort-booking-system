# Resort Booking System

A modern, responsive booking system for a small resort, built with Next.js, Tailwind CSS, and Firebase.

> **Танилцуулга (Монгол):** Дэлгэрэнгүй системийн танилцуулга, эрх, үйлдлүүд, өгөгдлийн бүтэц — [ТАНИЛЦУУЛГА.md](./ТАНИЛЦУУЛГА.md)

## Features

- **User Role**: Browse houses, view details, book houses, view personal bookings.
- **Admin Role**: Manage houses (add/edit/delete), manage bookings (confirm/cancel).
- **Authentication**: Secure login/signup using Firebase Auth.
- **Responsive Design**: Works on mobile and desktop.

## Prerequisites

- Node.js installed.
- A Firebase account (free tier is sufficient).

## Setup Instructions

### 1. Firebase Setup

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  **Enable Authentication**:
    -   Go to "Build" > "Authentication".
    -   Click "Get Started".
    -   Enable "Email/Password" provider.
4.  **Enable Firestore**:
    -   Go to "Build" > "Firestore Database".
    -   Click "Create Database".
    -   Start in **Test Mode** (for development) or Production Mode (you will need to update rules).
5.  **Get Config**:
    -   Go to Project Settings (gear icon).
    -   Scroll down to "Your apps" and click the Web icon (`</>`).
    -   Register the app (e.g., "ResortSystem").
    -   Copy the `firebaseConfig` object values.

### 2. Environment Variables

1.  Rename `.env.local.example` (if exists) or create a new file named `.env.local` in the root directory.
2.  Add your Firebase config keys:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Admin Access

By default, new users are regular 'users'. To make a user an 'admin':
1.  Sign up a new user in the app.
2.  Go to Firebase Console > Firestore Database.
3.  Find the `users` collection.
4.  Find the document with the user's UID.
5.  Change the `role` field from `"user"` to `"admin"`.
6.  Refresh the app. You will now see the "Admin Dashboard" link.

## Deployment (Vercel)

The easiest way to deploy is using [Vercel](https://vercel.com).

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add the Environment Variables (from step 2) in the Vercel Project Settings.
4.  Deploy!
