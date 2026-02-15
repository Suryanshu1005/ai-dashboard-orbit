# AI Query Generation with Google Gemini

## How It Works

The system uses a **fallback strategy** for query generation:

1. **Primary: Google Gemini** (when API key is available)
   - Generates database-specific queries based on natural language
   - For SQL databases: Generates SQL queries
   - For MongoDB: Generates aggregation pipelines
   - More accurate and handles complex queries

2. **Fallback: Simple Parser** (when Gemini is unavailable)
   - Pattern-based query parsing
   - Handles basic queries like "show me all users", "users older than 25"
   - Works without API key

## Integration Flow

```
User enters query
    ↓
API Route (/api/query)
    ↓
Try Gemini AI first
    ↓
    ├─ Success → Use AI-generated query
    └─ Failure → Fall back to simple parser
    ↓
Execute query on database
```

## How to Enable Gemini

1. Get your Google Gemini API key from https://makersuite.google.com/app/apikey
2. Add to `.env.local`:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
3. Install the package: `npm install @google/generative-ai`
4. Restart the development server
5. The system will automatically use Gemini for query generation

## What Gemini Generates

### For SQL Databases (PostgreSQL, MySQL, SQL Server):
- Standard SQL queries
- Example: `SELECT * FROM users WHERE age > 25 ORDER BY name LIMIT 10`

### For MongoDB:
- Aggregation pipeline as JSON array
- Example: `[{"$match": {"age": {"$gt": 25}}}, {"$sort": {"name": 1}}, {"$limit": 10}]`

## Benefits of Using Gemini

- **Better understanding**: Handles complex natural language queries
- **Context-aware**: Understands relationships and intent
- **Database-specific**: Generates appropriate syntax for each database type
- **Flexible**: Can handle queries the simple parser cannot
- **Free tier available**: Google offers free API access

## Fallback Behavior

If Gemini is unavailable (no API key, API error, etc.), the system automatically falls back to the simple parser, ensuring the application always works.

