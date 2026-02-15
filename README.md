# AI Dashboard Builder MVP

A simple, lightweight dashboard application that connects to any database and generates visualizations using natural language queries.

## Features

- 🔌 **Multi-Database Support**: Connect to PostgreSQL, MySQL, MongoDB, and SQL Server
- 🤖 **Natural Language Queries**: Use simple queries like "show me all users older than 25"
- 📊 **Auto Chart Generation**: Automatically create charts from query results
- 🎨 **Multiple Chart Types**: Bar, Line, Pie, Area, and Scatter charts
- ⚡ **Lightweight**: No heavy tools, minimal dependencies

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: Simple query parser (Claude API ready when key is available)
- **Database Drivers**: pg, mysql2, mongodb, mssql

## Quick Start

### 1. Install Dependencies

```bash
cd dashboard-app
npm install
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local` in the root directory:

```env
# Required: NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Gemini API key for AI query generation
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: MongoDB connection (if not set, uses in-memory storage)
# For local MongoDB: mongodb://localhost:27017/dashboard_app
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dashboard_app
MONGODB_URI=mongodb://localhost:27017/dashboard_app
MONGODB_DB_NAME=dashboard_app
```

**Notes**:
- `NEXTAUTH_SECRET` is required for authentication. Generate one with: `openssl rand -base64 32`
- The app works without Gemini API key using a simple query parser
- If `MONGODB_URI` is not set, the app uses in-memory storage (data lost on restart)
- See `MONGODB_SETUP.md` for detailed MongoDB setup instructions

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign Up/Login**: Create an account or sign in to access the dashboard builder
2. **Connect**: Enter your database connection string and select the database type
3. **Select Table**: Choose a table from the list
4. **Query**: Enter a natural language query like:
   - "show me all users"
   - "users older than 25"
   - "select name, email from users"
5. **Generate Chart**: Select chart type and generate visualization
6. **Save to Dashboard**: Save charts and tables to your personal dashboards

## Database Connection Strings

### PostgreSQL
```
postgresql://username:password@host:port/database
```

### MySQL
```
mysql://username:password@host:port/database
```

### MongoDB
```
mongodb://username:password@host:port/database
```

### SQL Server
```
mssql://username:password@host:port/database
```

## Project Structure

```
dashboard-app/
├── app/
│   ├── api/              # API routes
│   │   ├── connect/      # Database connection
│   │   ├── tables/       # Table listing
│   │   ├── query/        # Query execution
│   │   └── chart/        # Chart generation
│   ├── components/       # React components
│   │   ├── ConnectionForm.tsx
│   │   ├── TableList.tsx
│   │   ├── QueryChat.tsx
│   │   ├── ChartSelector.tsx
│   │   └── ChartDisplay.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── db/              # Database connectors
│   ├── ai/              # Claude API (ready for integration)
│   └── utils/           # Query parser
└── package.json
```

## Adding Claude API Support

When you have an Anthropic API key:

1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Uncomment the code in `lib/ai/claude.ts`
3. The app will automatically use Claude for better query parsing

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Features

- ✅ User authentication (signup/login)
- ✅ User-specific dashboards (data persists per user)
- ✅ Multi-database support (PostgreSQL, MySQL, MongoDB, SQL Server)
- ✅ Natural language query processing
- ✅ Multiple chart types (Bar, Line, Pie, Area, Scatter)
- ✅ Table visualization
- ✅ MongoDB storage for persistence

## Limitations (MVP)

- Single connection at a time
- No connection persistence across sessions
- Basic query support (SELECT, WHERE, ORDER BY, LIMIT)
- Simple natural language parsing (can be enhanced with Gemini)
- No data caching

## License

MIT

