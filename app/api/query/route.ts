import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, getTableSchema, getCurrentDbType, getConnectionStore } from '@/lib/db/connectors';
import { parseNaturalLanguageQuery } from '@/lib/utils/queryParser';
import { generateQueryWithClaude } from '@/lib/ai/claude';
import { auth } from '@/lib/auth';
import { getActiveConnection } from '@/lib/storage/connections';
import { enforceMongoDBLimit, enforceSQLLimit, validateQuery } from '@/lib/utils/queryValidator';
import { saveQuery } from '@/lib/storage/queryHistory';
import { QueryTimeoutError } from '@/lib/utils/queryTimeout';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tableName, query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get current database type
    const dbType = getCurrentDbType();
    if (!dbType) {
      return NextResponse.json(
        { error: 'No database connection established' },
        { status: 400 }
      );
    }

    // If no tableName provided, try to infer from query or get first table
    let finalTableName = tableName;
    if (!finalTableName) {
      const { getTables } = await import('@/lib/db/connectors');
      const tables = await getTables();
      if (tables.length === 0) {
        return NextResponse.json(
          { error: 'No tables found in database' },
          { status: 400 }
        );
      }
      
      // Try to infer table name from query (simple pattern matching)
      const queryLower = query.toLowerCase();
      const matchingTable = tables.find((t) => 
        queryLower.includes(t.name.toLowerCase())
      );
      finalTableName = matchingTable?.name || tables[0].name;
    }

    // Get table schema
    const columns = await getTableSchema(finalTableName);
    const columnNames = columns.map((col) => col.name);
    const schemaString = columns.map((col) => `${col.name} ${col.type}`).join(', ');

    let generatedQuery: string;
    let queryType: 'sql' | 'mongodb' = 'sql';
    let useClaude = false;

    // Try Claude API if available, otherwise use simple parser
    try {
      const claudeResult = await generateQueryWithClaude(finalTableName, schemaString, query, dbType);
      generatedQuery = claudeResult.query;
      queryType = claudeResult.queryType;
      useClaude = true;
    } catch (error: any) {
      // Gemini not available or failed, use simple parser as fallback
      console.log('Gemini not available, using simple parser:', error.message);
      const parseResult = parseNaturalLanguageQuery(finalTableName, query, columnNames, dbType);
      if (!parseResult.isValid) {
        return NextResponse.json(
          { error: parseResult.error || 'Failed to parse query' },
          { status: 400 }
        );
      }
      generatedQuery = parseResult.query;
      queryType = parseResult.queryType;
    }

    // Get active connection for timeout config
    let queryTimeout: number | undefined;
    try {
      const activeConnection = await getActiveConnection(session.user.id);
      if (activeConnection) {
        queryTimeout = activeConnection.queryTimeout;
      }
    } catch (err) {
      // Ignore error, use default timeout
    }

    // Validate query before execution
    const validation = validateQuery(generatedQuery, queryType);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: validation.error || 'Query validation failed',
          code: validation.code || 'UNSAFE_QUERY',
        },
        { status: 400 }
      );
    }

    // Enforce LIMIT if missing
    let finalQuery = generatedQuery;
    if (queryType === 'sql' && validation.code === 'MISSING_LIMIT') {
      finalQuery = enforceSQLLimit(generatedQuery);
    } else if (queryType === 'mongodb' && validation.code === 'MISSING_LIMIT') {
      const pipeline = JSON.parse(generatedQuery);
      const enforcedPipeline = enforceMongoDBLimit(pipeline);
      finalQuery = JSON.stringify(enforcedPipeline);
    }

    // Execute query with timeout
    const startTime = Date.now();
    let results: any[];
    let executionError: string | undefined;
    try {
      results = await executeQuery(finalQuery, queryType, finalTableName, queryTimeout);
    } catch (error: any) {
      executionError = error.message;
      if (error instanceof QueryTimeoutError) {
          // Save failed query to history
          try {
            let connectionId: string | null = null;
            const activeConnection = await getActiveConnection(session.user.id);
            
            if (activeConnection) {
              connectionId = activeConnection.id;
            } else {
              // Create a hash-based connection ID for unsaved connections
              const store = getConnectionStore();
              if (store.connectionString) {
                const hash = crypto.createHash('sha256').update(store.connectionString).digest('hex').substring(0, 16);
                connectionId = `temp_${hash}`;
              }
            }
            
            if (connectionId) {
              await saveQuery(session.user.id, connectionId, {
                naturalLanguageQuery: query,
                generatedQuery: finalQuery,
                queryType,
                tableName: finalTableName,
                resultsCount: 0,
                executionTime: Date.now() - startTime,
                success: false,
                error: executionError,
              });
            }
          } catch (historyError) {
            console.error('Failed to save query to history:', historyError);
          }

        return NextResponse.json(
          { 
            error: error.message,
            code: 'TIMEOUT',
          },
          { status: 408 }
        );
      }
      throw error;
    }
    const executionTime = Date.now() - startTime;

    // Get column names from results
    const resultColumns = results.length > 0 ? Object.keys(results[0]) : columnNames;

    // Save to query history
    try {
      // Try to get active connection first
      let connectionId: string | null = null;
      const activeConnection = await getActiveConnection(session.user.id);
      
      if (activeConnection) {
        connectionId = activeConnection.id;
      } else {
        // If no saved connection, create a connection identifier from the connection string
        // This allows query history to work even for unsaved connections
        const store = getConnectionStore();
        if (store.connectionString) {
          // Create a hash-based connection ID for unsaved connections
          const hash = crypto.createHash('sha256').update(store.connectionString).digest('hex').substring(0, 16);
          connectionId = `temp_${hash}`;
        }
      }
      
      if (connectionId) {
        await saveQuery(session.user.id, connectionId, {
          naturalLanguageQuery: query,
          generatedQuery: finalQuery,
          queryType,
          tableName: finalTableName,
          resultsCount: results.length,
          executionTime,
          success: true,
        });
      }
    } catch (historyError) {
      // Don't fail the request if history save fails
      console.error('Failed to save query to history:', historyError);
    }

    return NextResponse.json({
      query: finalQuery,
      queryType,
      data: results,
      columns: resultColumns,
      rowCount: results.length,
      usedClaude: useClaude,
      executionTime,
    });
  } catch (error: any) {
    console.error('Query API error:', error);
    
    // Check for timeout error
    if (error.name === 'QueryTimeoutError') {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'TIMEOUT',
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Query execution failed',
        code: 'EXECUTION_ERROR',
      },
      { status: 500 }
    );
  }
}

