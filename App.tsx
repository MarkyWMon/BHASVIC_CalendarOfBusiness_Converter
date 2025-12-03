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
    <div className="min-h-screen bg-white">
      {/* Brand Header */}
      <div className="border-t-[8px] border-bhasvic-red bg-white shadow-sm mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-display font-bold text-black tracking-tight mb-2">
              BHASVIC
            </h1>
            <h2 className="text-xl font-display text-gray-600 font-light">
              Calendar Converter
            </h2>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-8">
          {/* File Upload */}
          <section>
            <h3 className="text-2xl font-display font-bold text-bhasvic-navy mb-4">1. Upload Schedule</h3>
            <FileUpload onFileSelect={handleFileSelect} selectedFileName={file?.name || null} />
          </section>

          {/* Configuration */}
          {file && (
            <section className="animate-fade-in-down">
              <h3 className="text-2xl font-display font-bold text-bhasvic-navy mb-4">2. Configuration</h3>
              <OptionsForm options={options} setOptions={setOptions} disabled={isProcessing} />
              
              <div className="flex justify-center md:justify-start mt-6">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className={`
                    w-full md:w-auto px-10 py-4 rounded-none shadow-md text-white font-display font-bold text-lg tracking-wide transition-all
                    ${isProcessing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-bhasvic-red hover:bg-bhasvic-darkRed focus:outline-none focus:ring-4 focus:ring-red-200'
                    }
                  `}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      PROCESSING...
                    </span>
                  ) : (
                    'CONVERT CALENDAR'
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Logs */}
          <section>
             {logs.length > 0 && (
                <div className="mt-8">
                  <LogArea logs={logs} />
                </div>
             )}
          </section>

          {/* Results / Download */}
          {result && (
            <div className="bg-gray-50 border-l-[6px] border-bhasvic-green p-6 animate-fade-in shadow-sm">
              <h3 className="text-2xl font-display font-bold text-black mb-6">Conversion Complete</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <h4 className="font-display font-bold text-xl text-bhasvic-navy">Main Calendar</h4>
                    <p className="text-gray-500 mt-2 font-light">{result.allEvents.length} events found.</p>
                  </div>
                  <button
                    onClick={() => downloadFile(result.mainIcsContent, 'BHASVIC_Calendar.ics')}
                    className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium text-white bg-bhasvic-navy hover:bg-bhasvic-lightNavy transition-colors rounded-none"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Main .ics
                  </button>
                </div>

                {result.publicIcsContent && (
                  <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
                    <div>
                      <h4 className="font-display font-bold text-xl text-bhasvic-orange">Public Calendar</h4>
                      <p className="text-gray-500 mt-2 font-light">{result.publicEvents.length} public events found.</p>
                    </div>
                    <button
                      onClick={() => downloadFile(result.publicIcsContent!, 'BHASVIC_Public_Calendar.ics')}
                      className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium text-white bg-bhasvic-orange hover:bg-[#D05829] transition-colors rounded-none"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Public .ics
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