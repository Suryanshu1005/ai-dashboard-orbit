# MongoDB Setup Guide

This application uses MongoDB to store dashboards, charts, and tables. The system includes a fallback to in-memory storage if MongoDB is not configured.

## Quick Setup

### Option 1: Local MongoDB

1. **Install MongoDB** (if not already installed):
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Add to `.env.local`**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/dashboard_app
   MONGODB_DB_NAME=dashboard_app
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create a free cluster** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Get connection string**:
   - Go to your cluster → Connect → Connect your application
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

3. **Add to `.env.local`**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dashboard_app?retryWrites=true&w=majority
   MONGODB_DB_NAME=dashboard_app
   ```

### Option 3: No Setup (In-Memory Storage)

If you don't set `MONGODB_URI`, the app will use in-memory storage. **Note**: Data will be lost on server restart.

## Environment Variables

Create `.env.local` in the project root:

```env
# Required for AI query generation
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: MongoDB connection (if not set, uses in-memory storage)
MONGODB_URI=mongodb://localhost:27017/dashboard_app
MONGODB_DB_NAME=dashboard_app
```

## MongoDB Document Structure

### Dashboards Collection

```javascript
{
  _id: ObjectId("..."),
  id: "1234567890",  // Custom ID
  name: "Sales Dashboard",
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  charts: [
    {
      id: "1705312345678",
      chartType: "bar",
      xAxisKey: "_id",
      yAxisKey: "no_of_travelers",
      chartData: [...],
      title: "bar Chart",
      createdAt: "2024-01-15T10:35:00Z"
    }
  ],
  tables: [
    {
      id: "1705312567890",
      tableData: [...],
      columns: ["_id", "name", "amount"],
      title: "Query Results",
      maxRows: 100,
      createdAt: "2024-01-15T10:45:00Z"
    }
  ]
}
```

## Testing the Connection

After setting up MongoDB, restart your Next.js server:

```bash
npm run dev
```

Check the console for: `Connected to MongoDB`

If you see connection errors, verify:
- MongoDB is running (for local setup)
- Connection string is correct
- Network access is allowed (for Atlas)

## Troubleshooting

**Error: "Failed to connect to MongoDB"**
- Check if MongoDB is running: `mongosh` or `mongo`
- Verify connection string format
- Check firewall settings for Atlas

**Data not persisting**
- Ensure `MONGODB_URI` is set in `.env.local`
- Check MongoDB connection logs
- Verify database name matches

**Using in-memory fallback**
- This is normal if `MONGODB_URI` is not set
- Data will be lost on server restart
- Set `MONGODB_URI` to enable persistence

