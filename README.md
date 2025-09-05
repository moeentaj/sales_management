# Sales Management System

A comprehensive field sales and collection management system built with Node.js, React, and PostgreSQL.

## Features

- User management with enhanced staff information
- Distributor management and assignments
- Product catalog management
- Invoice generation and management
- Payment collection with image capture
- Mobile-optimized interface for sales staff
- Admin dashboard with analytics
- Role-based access control

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Git

### Installation

1. Clone the repository
2. Install backend dependencies: `cd backend 
Unknown command: "install`"


Did you mean one of these?
  npm install # Install a package
  npm uninstall # Remove a package
To see a list of supported npm commands, run:
  npm help
3. Install frontend dependencies: `cd frontend 
Unknown command: "install`"


Did you mean one of these?
  npm install # Install a package
  npm uninstall # Remove a package
To see a list of supported npm commands, run:
  npm help
4. Set up the database using the scripts in the database directory
5. Configure environment variables (copy .env.example to .env)
6. Run migrations: `npm run db:migrate`
7. Start the development servers

### Development

```bash
# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm start
```

## Project Structure

- `/backend` - Express.js API server
- `/frontend` - React.js web application
- `/database` - Database schema and migration scripts
- `/docs` - Documentation files
- `/scripts` - Utility scripts

## Demo Credentials

- Admin: admin@company.com / admin123
- Sales Staff: sales@company.com / sales123

## License

MIT License
