export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'mssql';

export interface Table {
  name: string;
  type: string;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: Column[];
}

export interface ConnectionConfig {
  connectionString: string;
  dbType: DatabaseType;
}

