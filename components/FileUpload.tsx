import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFileName: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFileName }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      onFileSelect(file);
    } else {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed p-10 text-center cursor-pointer transition-all group
          ${isDragging 
            ? 'border-bhasvic-red bg-red-50' 
            : 'border-gray-300 hover:border-bhasvic-red hover:bg-gray-50 bg-white'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleChange}
        />
        
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto group-hover:bg-red-100 transition-colors">
            <svg className="h-8 w-8 text-gray-400 group-hover:text-bhasvic-red transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="font-display font-semibold text-bhasvic-red text-lg">
              Click to upload
            </span>
            <span className="text-gray-500 font-light mx-2">or drag and drop</span>
          </div>
          <p className="text-xs text-gray-400 font-light">
            Excel files (.xlsx, .xls) only
          </p>
        </div>
      </div>

      {selectedFileName && (
        <div className="flex items-center p-4 mt-4 bg-bhasvic-lightGreen/10 text-bhasvic-green border border-bhasvic-lightGreen rounded-none">
           <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <span className="font-medium truncate">{selectedFileName}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;