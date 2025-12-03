import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import OptionsForm from './components/OptionsForm';
import LogArea from './components/LogArea';
import { parseWorkbook } from './services/excelParser';
import { generateICS } from './services/icsGenerator';
import { ProcessingOptions, ProcessingLog, ParsedResult } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [result, setResult] = useState<ParsedResult | null>(null);
  
  const [options, setOptions] = useState<ProcessingOptions>({
    includeInitials: true,
    createPublicCalendar: true,
    defaultStartTime: "08:00",
    defaultEndTime: "16:00"
  });

  const addLog = (message: string, type: ProcessingLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }]);
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setLogs([]);
    setResult(null);
    addLog(`File selected: ${selectedFile.name}`);
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setLogs([]); // Clear old logs
    setResult(null);
    addLog('Starting conversion process...', 'info');

    try {
      // 1. Parse Excel
      const allEvents = await parseWorkbook(file, options, (log) => {
        setLogs(prev => [...prev, log]);
      });

      if (allEvents.length === 0) {
        addLog('No events found in the spreadsheet.', 'warning');
        setIsProcessing(false);
        return;
      }

      // 2. Separate Public Events
      const publicEvents = allEvents.filter(e => e.isPublic);
      addLog(`Found ${publicEvents.length} public events out of ${allEvents.length} total.`, 'info');

      // 3. Generate ICS Strings
      addLog('Generating ICS file content...', 'info');
      const mainIcsContent = generateICS(allEvents, options.includeInitials);
      
      let publicIcsContent: string | null = null;
      if (options.createPublicCalendar && publicEvents.length > 0) {
        publicIcsContent = generateICS(publicEvents, options.includeInitials);
      } else if (options.createPublicCalendar) {
        addLog('Skipping public calendar generation (no public events found).', 'warning');
      }

      setResult({
        allEvents,
        publicEvents,
        mainIcsContent,
        publicIcsContent
      });

      addLog('Conversion completed successfully! Ready for download.', 'success');

    } catch (error: any) {
      console.error(error);
      addLog(`Error processing file: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            BHASVIC Calendar Converter
          </h1>
          <p className="text-lg text-gray-600">
            Convert the college Excel schedule into standard Calendar files (.ics)
          </p>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <FileUpload onFileSelect={handleFileSelect} selectedFileName={file?.name || null} />

          {/* Configuration */}
          {file && (
            <div className="animate-fade-in-down">
              <OptionsForm options={options} setOptions={setOptions} disabled={isProcessing} />
              
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className={`
                    w-full md:w-auto px-8 py-3 rounded-md shadow-lg text-white font-bold text-lg transition-all transform hover:-translate-y-1
                    ${isProcessing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }
                  `}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Convert to Calendar'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Logs */}
          <LogArea logs={logs} />

          {/* Results / Download */}
          {result && (
            <div className="bg-white rounded-lg shadow-lg border-t-4 border-green-500 p-6 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Conversion Complete</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md bg-gray-50 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Main Calendar</h4>
                    <p className="text-sm text-gray-500 mt-1">{result.allEvents.length} events</p>
                  </div>
                  <button
                    onClick={() => downloadFile(result.mainIcsContent, 'BHASVIC_Calendar.ics')}
                    className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Main
                  </button>
                </div>

                {result.publicIcsContent && (
                  <div className="p-4 border rounded-md bg-gray-50 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Public Calendar</h4>
                      <p className="text-sm text-gray-500 mt-1">{result.publicEvents.length} events</p>
                    </div>
                    <button
                      onClick={() => downloadFile(result.publicIcsContent!, 'BHASVIC_Public_Calendar.ics')}
                      className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Public
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
