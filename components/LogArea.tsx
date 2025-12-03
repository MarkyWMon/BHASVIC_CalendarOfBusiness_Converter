import React, { useEffect, useRef } from 'react';
import { ProcessingLog } from '../types';

interface LogAreaProps {
  logs: ProcessingLog[];
}

const LogArea: React.FC<LogAreaProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden mb-6">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <h4 className="text-gray-300 text-sm font-mono font-bold">Processing Log</h4>
        <span className="text-gray-500 text-xs">{logs.length} entries</span>
      </div>
      <div className="h-48 overflow-y-auto p-4 font-mono text-sm scrollbar-thin">
        {logs.map((log) => (
          <div key={log.id} className="mb-1 flex items-start">
            <span className="text-gray-500 mr-2 shrink-0">
              [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}]
            </span>
            <span className={`break-all ${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              'text-gray-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogArea;
