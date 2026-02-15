'use client';

interface TableDisplayProps {
  tableData: any[];
  columns: string[];
  title?: string;
  maxRows?: number;
}

export default function TableDisplay({ tableData, columns, title, maxRows = 100 }: TableDisplayProps) {
  if (!tableData || tableData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600 text-center text-sm">No table data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {title && (
        <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      )}
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.slice(0, maxRows).map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-sm text-gray-700">
                    {row[col] !== null && row[col] !== undefined
                      ? String(row[col]).length > 100
                        ? String(row[col]).substring(0, 100) + '...'
                        : String(row[col])
                      : <span className="text-gray-400">NULL</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length > maxRows && (
          <div className="p-2 bg-gray-50 text-gray-600 text-xs text-center border-t border-gray-200">
            Showing first {maxRows} of {tableData.length} rows
          </div>
        )}
      </div>
    </div>
  );
}

