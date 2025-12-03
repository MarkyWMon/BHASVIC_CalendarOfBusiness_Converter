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
    <div className="bg-white p-8 shadow-sm border border-gray-200">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <label className="flex items-start space-x-4 p-4 border border-gray-100 hover:bg-gray-50 transition cursor-pointer group">
            <input
              type="checkbox"
              checked={options.includeInitials}
              onChange={(e) => handleChange('includeInitials', e.target.checked)}
              disabled={disabled}
              className="h-5 w-5 text-bhasvic-red rounded border-gray-300 focus:ring-bhasvic-red mt-0.5"
            />
            <div>
              <span className="font-display font-semibold text-gray-800 group-hover:text-black">Include Staff Initials</span>
              <p className="text-sm text-gray-500 font-light mt-1">Append (ABC) to event titles</p>
            </div>
          </label>

          <label className="flex items-start space-x-4 p-4 border border-gray-100 hover:bg-gray-50 transition cursor-pointer group">
            <input
              type="checkbox"
              checked={options.createPublicCalendar}
              onChange={(e) => handleChange('createPublicCalendar', e.target.checked)}
              disabled={disabled}
              className="h-5 w-5 text-bhasvic-red rounded border-gray-300 focus:ring-bhasvic-red mt-0.5"
            />
            <div>
              <span className="font-display font-semibold text-gray-800 group-hover:text-black">Generate Public Calendar</span>
              <p className="text-sm text-gray-500 font-light mt-1">Create a separate file for events marked with '-p'</p>
            </div>
          </label>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold font-display text-gray-700 mb-2">Default Start Time</label>
            <input
              type="time"
              value={options.defaultStartTime}
              onChange={(e) => handleChange('defaultStartTime', e.target.value)}
              disabled={disabled}
              className="block w-full border-gray-300 shadow-sm focus:border-bhasvic-red focus:ring-bhasvic-red sm:text-sm p-3 border rounded-none"
            />
            <p className="text-xs text-gray-400 mt-1 font-light">For day events without explicit times</p>
          </div>

          <div>
            <label className="block text-sm font-bold font-display text-gray-700 mb-2">Default End Time</label>
            <input
              type="time"
              value={options.defaultEndTime}
              onChange={(e) => handleChange('defaultEndTime', e.target.value)}
              disabled={disabled}
              className="block w-full border-gray-300 shadow-sm focus:border-bhasvic-red focus:ring-bhasvic-red sm:text-sm p-3 border rounded-none"
            />
            <p className="text-xs text-gray-400 mt-1 font-light">For day events without explicit times</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsForm;