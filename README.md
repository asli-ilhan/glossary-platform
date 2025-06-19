# Glossary App

A Next.js glossary application with MongoDB backend and NextAuth.js authentication, featuring role-based permissions for users and admins.

## Features

- **Authentication**: Secure user registration and login with NextAuth.js
- **Role-based Access**: Different permissions for users and admins
- **Glossary Management**: Add, edit, delete, and approve glossary terms
- **MongoDB Backend**: Scalable NoSQL database with Mongoose ODM
- **Responsive UI**: Modern interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Authentication**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS
- **Password Hashing**: bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd glossary-app-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-key-here-change-this-in-production
   ```

   **Important**: Replace the MongoDB URI with your actual connection string from MongoDB Atlas.

4. **Run the development server**
```bash
npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### User Roles

- **Users**: Can add new terms and edit/delete their own terms
- **Admins**: Can approve, edit, and delete any term

### Getting Started

1. **Register a new account** at `/auth/register`
2. **Sign in** at `/auth/signin`
3. **View the glossary** at `/glossary`
4. **Admin dashboard** (admin users only) at `/admin/dashboard`

## API Endpoints

- `GET /api/glossary` - Get all approved terms
- `POST /api/glossary` - Add a new term (authenticated users)
- `PATCH /api/glossary?id=<id>` - Update/approve a term (admin or owner)
- `DELETE /api/glossary?id=<id>` - Delete a term (admin or owner)
- `POST /api/auth/register` - Register a new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   └── register/route.ts         # User registration
│   │   └── glossary/route.ts             # Glossary CRUD operations
│   ├── auth/
│   │   ├── signin/page.tsx               # Sign-in page
│   │   └── register/page.tsx             # Registration page
│   ├── admin/
│   │   ├── page.tsx                      # Admin redirect
│   │   └── dashboard/page.tsx            # Admin dashboard
│   ├── glossary/page.tsx                 # Main glossary page
│   ├── utils/
│   │   ├── mongodb.ts                    # MongoDB connection
│   │   ├── User.ts                       # User model
│   │   └── GlossaryTerm.ts               # GlossaryTerm model
│   └── layout.tsx                        # Root layout with SessionProvider
```

## Deployment

1. **Set up MongoDB Atlas** (if not already done)
2. **Configure environment variables** in your deployment platform
3. **Deploy to Vercel, Netlify, or your preferred platform**

## Security Features

- Password hashing with bcrypt
- JWT-based sessions
- Role-based access control
- API route protection
- Input validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
