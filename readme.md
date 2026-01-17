# Unified Admin Interface - Local Setup Guide

This guide will help you set up and run the Unified Admin Interface on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Getting Started

1. **Clone or Download the Project**
   Download the project files to your local machine.

2. **Install Dependencies**
   Open your terminal in the project root directory and run:
   ```bash
   npm install
   ```

3. **Environment Variables**
   The application is designed to communicate with an external API at `https://unifyapi.onrender.com`. No additional environment variables are strictly required for basic functionality as the API URL is currently hardcoded in the frontend and backend proxy.

4. **Launch the Development Server**
   To start the application in development mode:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`.

## Project Structure

- `client/`: React frontend source code.
- `server/`: Express backend proxy source code.
- `shared/`: Shared TypeScript types and routes.
- `attached_assets/`: Static assets like logos.

## Key Features

- **Authentication**: Proxied through the local server to the Unified API.
- **Theme Support**: Light/Dark mode and custom accent color selection.
- **Animations**: Powered by Framer Motion for a smooth user experience.
- **No Local Database**: All data is managed via external APIs.

## Building for Production

To create a production-ready build:
```bash
npm run build
```
The optimized files will be generated in the `dist/` directory.
