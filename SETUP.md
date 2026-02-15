# Setup Instructions

## Quick Setup

1. **Navigate to the project directory:**
   ```bash
   cd dashboard-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file (optional):**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and add your Anthropic API key when you have it.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## What's Included

✅ Complete Next.js project structure  
✅ Database connectors for PostgreSQL, MySQL, MongoDB, SQL Server  
✅ API routes for connection, tables, queries, and charts  
✅ React components for all features  
✅ Simple query parser (works without Claude API)  
✅ Chart generation with Recharts  
✅ Tailwind CSS styling  

## Next Steps

1. Install dependencies: `npm install`
2. Test with a database connection
3. When you get Claude API key, add it to `.env.local` for better query parsing

## Troubleshooting

**TypeScript errors before installation:**
- These are expected. Run `npm install` first.

**Module not found errors:**
- Make sure you've run `npm install`
- Check that all dependencies are in `package.json`

**Database connection issues:**
- Verify your connection string format
- Ensure the database is running and accessible
- Check firewall settings

