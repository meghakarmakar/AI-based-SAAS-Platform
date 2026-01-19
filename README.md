# QuickAI - Full Stack AI Tools Platform

A comprehensive full-stack web application that provides various AI-powered tools including content generation, image processing, and more.

## 🚀 Features

- **Blog Title Generation** - AI-powered blog title suggestions
- **Article Writing** - Automated article content generation
- **Image Generation** - Create images from text descriptions
- **Background Removal** - Remove backgrounds from images
- **Object Removal** - Remove unwanted objects from images
- **Resume Review** - AI-powered resume analysis and feedback
- **User Authentication** - Secure authentication with Clerk
- **Dashboard** - Track your creations and usage

## 🛠️ Tech Stack

### Frontend
- React 19
- Vite
- TailwindCSS 4
- React Router DOM
- Clerk Authentication
- Axios
- Lucide React (Icons)
- React Hot Toast

### Backend
- Node.js
- Express.js 5
- MongoDB (Mongoose)
- Cloudinary (Image storage)
- Google Generative AI (Gemini)
- ClipDrop API
- Clerk Express
- Multer (File uploads)

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Clerk account
- Cloudinary account
- Google AI (Gemini) API key
- ClipDrop API key

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd QuickAI-Full-Stack
```

### 2. Install server dependencies
```bash
cd server
npm install
```

### 3. Install client dependencies
```bash
cd ../client
npm install
```

### 4. Environment Setup

#### Server Configuration
Create a `.env` file in the `server` directory:
```bash
cd server
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
# MongoDB Database
MONGO_URI=your_mongodb_connection_string

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key
CLIPDROP_API_KEY=your_clipdrop_api_key
```

#### Client Configuration
Create a `.env` file in the `client` directory with your Clerk publishable key:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## 🚀 Running the Application

### Development Mode

#### Start the server:
```bash
cd server
npm run server  # with nodemon (auto-reload)
# or
npm start       # without auto-reload
```
Server will run on `http://localhost:3000` (or your configured PORT)

#### Start the client:
```bash
cd client
npm run dev
```
Client will run on `http://localhost:5173`

### Production Mode

#### Build the client:
```bash
cd client
npm run build
```

## 📁 Project Structure

```
QuickAI-Full-Stack/
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   ├── src/
│   │   ├── assets/        # Images, icons, etc.
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── server/                # Backend Node.js application
    ├── configs/           # Configuration files
    ├── controllers/       # Route controllers
    ├── middlewares/       # Custom middlewares
    ├── models/            # Database models
    ├── routes/            # API routes
    ├── package.json
    └── server.js          # Entry point
```

## 🔑 API Endpoints

### AI Routes
- `POST /api/ai/blog-titles` - Generate blog titles
- `POST /api/ai/write-article` - Generate article content
- `POST /api/ai/generate-image` - Generate images from text
- `POST /api/ai/remove-background` - Remove image background
- `POST /api/ai/review-resume` - Analyze resume

### User Routes
- `GET /api/user/creations` - Get user's creations
- Authentication handled by Clerk middleware

## 🌐 Deployment

### Vercel Deployment
Both client and server have `vercel.json` configurations for deployment on Vercel.

#### Deploy Client:
```bash
cd client
vercel
```

#### Deploy Server:
```bash
cd server
vercel
```

### Environment Variables
Make sure to set all environment variables in your deployment platform:
- MongoDB URI
- Clerk keys
- Cloudinary credentials
- AI API keys

## 🔒 Security Notes

- ⚠️ Never commit `.env` files to version control
- Keep all API keys and secrets secure
- Rotate credentials if accidentally exposed
- Use environment variables for all sensitive data

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For support, please open an issue in the GitHub repository.

---

Built with ❤️ using React, Node.js, and AI
