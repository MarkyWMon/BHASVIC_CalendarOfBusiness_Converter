import React from 'react';
import { ProcessingOptions } from '../types';

interface OptionsFormProps {
  options: ProcessingOptions;
  setOptions: React.Dispatch<React.SetStateAction<ProcessingOptions>>;
  disabled: boolean;
}

const OptionsForm: React.FC<OptionsFormProps> = ({ options, setOptions, disabled }) => {
  const handleChange = (key: keyof ProcessingOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        Configuration
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50 transition cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeInitials}
              onChange={(e) => handleChange('includeInitials', e.target.checked)}
              disabled={disabled}
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-700">Include Staff Initials</span>
              <p className="text-sm text-gray-500">Append (ABC) to event titles</p>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50 transition cursor-pointer">
            <input
              type="checkbox"
              checked={options.createPublicCalendar}
              onChange={(e) => handleChange('createPublicCalendar', e.target.checked)}
              disabled={disabled}
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-700">Generate Public Calendar</span>
              <p className="text-sm text-gray-500">Create a separate file for events marked with '-p'</p>
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Start Time</label>
            <input
              type="time"
              value={options.defaultStartTime}
              onChange={(e) => handleChange('defaultStartTime', e.target.value)}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
            <p className="text-xs text-gray-500 mt-1">For day events without explicit times</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default End Time</label>
            <input
              type="time"
              value={options.defaultEndTime}
              onChange={(e) => handleChange('defaultEndTime', e.target.value)}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
            <p className="text-xs text-gray-500 mt-1">For day events without explicit times</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsForm;
