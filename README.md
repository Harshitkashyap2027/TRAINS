# AETHER — Developer Identity & Collaboration Platform

> **Repository:** `Harshitkashyap2027/TRAINS`  
> The project is named **AETHER** internally; the repository is named **TRAINS**.

AETHER is an educational social media platform built for developers and learners. It lets you build a rich developer identity, share knowledge through posts and stories, collaborate on projects, and connect with peers — all in a modern, dark-themed progressive web app.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Installation](#local-installation)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Firebase Project Setup](#2-firebase-project-setup)
  - [3. Configure Firebase Credentials](#3-configure-firebase-credentials)
  - [4. Install the Firebase CLI](#4-install-the-firebase-cli)
  - [5. Install Cloud Functions Dependencies](#5-install-cloud-functions-dependencies)
  - [6. Run Locally with Firebase Emulators](#6-run-locally-with-firebase-emulators)
  - [7. Open the App](#7-open-the-app)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 🔐 **Authentication** — Email/password and social login via Firebase Auth, with an onboarding flow for new users
- 📝 **Posts & Comments** — Create, like, and comment on developer posts; real-time updates via Firestore
- 📸 **Stories** — Ephemeral stories with view tracking
- 🚀 **Projects** — Showcase public or private projects with collaborator access lists and starring
- 💬 **Chat** — Real-time direct messaging between users
- 🔔 **Notifications** — In-app notification system (powered by Cloud Functions)
- 🌐 **Explore & Hashtags** — Discover content by hashtag and trending topics
- 🛡️ **Admin Panel** — Role-based admin tooling for content moderation and reporting
- 📱 **PWA** — Installable progressive web app with offline-ready architecture
- 🎨 **Theming** — Dark/light theme support with CSS custom properties

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| Backend / Database | [Firebase Firestore](https://firebase.google.com/products/firestore) |
| Authentication | [Firebase Authentication](https://firebase.google.com/products/auth) |
| File Storage | [Firebase Storage](https://firebase.google.com/products/storage) |
| Server-side Logic | [Firebase Cloud Functions](https://firebase.google.com/products/functions) (Node.js 18) |
| Hosting | [Firebase Hosting](https://firebase.google.com/products/hosting) |
| Firebase SDK | Firebase JS SDK v10.7.1 (loaded via CDN) |

---

## Prerequisites

Make sure you have the following installed before you begin:

- [Node.js](https://nodejs.org/) **v18 or later** (`node -v` to check)
- [npm](https://www.npmjs.com/) **v8 or later** (bundled with Node.js)
- [Java JDK 11+](https://adoptium.net/) — required by the Firebase Emulator Suite
- A [Google / Firebase account](https://firebase.google.com/)

---

## Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Harshitkashyap2027/TRAINS.git
cd TRAINS
```

### 2. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. Enable the following services in your project:
   - **Authentication** → Sign-in methods → Enable *Email/Password* (and any social providers you want)
   - **Firestore Database** → Create a database in *test mode* (you will apply proper rules later)
   - **Storage** → Create a default bucket
   - **Functions** → Requires the *Blaze (pay-as-you-go)* plan

### 3. Configure Firebase Credentials

1. In the Firebase Console, go to **Project Settings → General → Your apps** and add a **Web app**.
2. Copy the Firebase config snippet shown.
3. Open `src/services/firebase.js` and replace the placeholder values with your real credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

> **Security note:** Never commit real API keys to version control. For production deployments consider using environment variables or [Firebase App Hosting secrets](https://firebase.google.com/docs/hosting/env-vars).

### 4. Install the Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select or create your Firebase project
```

### 5. Install Cloud Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 6. Run Locally with Firebase Emulators

The project ships with a complete emulator configuration (`firebase.json`). Start all emulators with a single command:

```bash
firebase emulators:start
```

This launches the following local services:

| Emulator | Default Port |
|----------|-------------|
| Firebase Hosting | http://localhost:5000 |
| Authentication | http://localhost:9099 |
| Firestore | http://localhost:8080 |
| Cloud Functions | http://localhost:5001 |
| Storage | http://localhost:9199 |
| Emulator UI dashboard | http://localhost:4000 |

> **Tip:** The Emulator UI at `http://localhost:4000` lets you inspect and modify Auth users, Firestore documents, and Storage buckets in real time — no production data is affected.

### 7. Open the App

Navigate to **http://localhost:5000** in your browser. You should see the AETHER loading screen and then be redirected to the login page.

Register a new account through the UI and complete the onboarding flow to start using the platform locally.

---

## Project Structure

```
TRAINS/
├── index.html                  # App entry point
├── firebase.json               # Firebase project configuration & emulator settings
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
├── public/
│   └── manifest.json           # PWA manifest
├── functions/
│   ├── index.js                # Cloud Functions entry point
│   └── package.json            # Functions dependencies
└── src/
    ├── core/
    │   ├── app.js              # App bootstrap & auth state observer
    │   ├── router.js           # Client-side router
    │   ├── store.js            # Global state store
    │   └── eventBus.js         # Event bus for decoupled communication
    ├── components/
    │   ├── layout/             # Sidebar, topbar, bottom navigation
    │   ├── social/             # Feed, post cards, story viewer, etc.
    │   └── ui/                 # Reusable UI components (modals, toasts, …)
    ├── pages/
    │   └── auth/               # Login, register, onboarding pages
    ├── services/
    │   ├── firebase.js         # Firebase initialization & exports
    │   ├── auth.service.js     # Authentication helpers
    │   ├── user.service.js     # User profile CRUD
    │   ├── post.service.js     # Posts & comments
    │   ├── project.service.js  # Projects
    │   ├── story.service.js    # Stories
    │   ├── chat.service.js     # Messaging
    │   ├── notification.service.js  # Notifications
    │   └── admin.service.js    # Admin operations
    ├── styles/
    │   ├── variables.css       # CSS custom properties / design tokens
    │   ├── base.css            # Global reset & base styles
    │   ├── glass.css           # Glassmorphism utility classes
    │   ├── bento.css           # Bento-grid layout utilities
    │   ├── layout.css          # App shell layout
    │   ├── animations.css      # Keyframe animations
    │   ├── themes.css          # Dark / light theme overrides
    │   └── main.css            # Page-level styles
    └── utils/
        ├── dom.js              # DOM helpers (toast, modal, …)
        ├── formatters.js       # Date, number, text formatters
        ├── media.js            # File upload / media utilities
        └── validators.js       # Form validation helpers
```

---

## Deployment

Deploy the frontend and Firestore/Storage rules to Firebase Hosting:

```bash
firebase deploy --only hosting,firestore:rules,storage
```

Deploy Cloud Functions separately:

```bash
firebase deploy --only functions
```

Deploy everything at once:

```bash
firebase deploy
```

---

## Contributing

Contributions are welcome! Here is a quick guide:

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit with a clear message:
   ```bash
   git commit -m "feat: add your feature description"
   ```
3. Push your branch and open a Pull Request against `main`.

Please keep PRs focused and include a clear description of what was changed and why.

---

## License

This project does not yet have an explicit license. If you intend to use or distribute this code, please open an issue or contact the repository owner to discuss licensing terms. A `LICENSE` file (e.g. MIT) is recommended to be added to the root of the repository.
