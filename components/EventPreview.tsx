import React, { useMemo, useState } from 'react';
import { CalendarEvent } from '../types';

interface EventPreviewProps {
  events: CalendarEvent[];
}

const EventPreview: React.FC<EventPreviewProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group events by Month (e.g., "September 2024")
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    events.forEach(event => {
      const monthYear = event.date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(event);
    });
    
    // Sort keys based on date of first event in group
    return Object.entries(groups).sort((a, b) => {
      return a[1][0].date.getTime() - b[1][0].date.getTime();
    });
  }, [events]);

  const displayedGroups = isExpanded ? groupedEvents : groupedEvents.slice(0, 1);

  return (
    <div className="bg-white border border-gray-200 shadow-sm mt-8 animate-fade-in">
      <div className="bg-bhasvic-navy p-4 flex justify-between items-center">
        <h3 className="text-white font-display font-bold text-lg">Schedule Preview</h3>
        <span className="text-blue-100 text-sm font-light">{events.length} Total Events</span>
      </div>

      <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
        {displayedGroups.map(([month, monthEvents]) => (
          <div key={month} className="border-b last:border-b-0 border-gray-100">
            <div className="bg-gray-50 px-6 py-2 border-y border-gray-100 sticky top-0 z-10">
              <span className="text-bhasvic-red font-display font-bold uppercase tracking-wider text-sm">
                {month}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {monthEvents.map((event, idx) => (
                <div key={event.uid + idx} className="px-6 py-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                  
                  {/* Date Badge */}
                  <div className="flex-shrink-0 flex sm:flex-col items-baseline sm:items-center w-16 text-gray-500">
                    <span className="text-2xl font-bold font-display text-gray-800 leading-none">
                      {event.date.getDate().toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs uppercase font-medium ml-2 sm:ml-0">
                      {event.date.toLocaleString('en-GB', { weekday: 'short' })}
                    </span>
                  </div>

                  {/* Time & Details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center text-sm text-bhasvic-lightNavy mb-1">
                      <svg className="w-4 h-4 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span className="font-mono">{event.startTime} - {event.endTime}</span>
                      {event.isPublic && (
                        <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium font-display truncate pr-4" title={event.description}>
                      {event.description} 
                      {event.staffInitials && <span className="text-gray-400 font-normal ml-1">({event.staffInitials})</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {!isExpanded && groupedEvents.length > 1 && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-full py-3 text-center text-sm font-bold text-bhasvic-navy hover:bg-gray-50 border-t border-gray-100 transition-colors font-display"
        >
          View All {groupedEvents.length} Months
        </button>
      )}
       {isExpanded && groupedEvents.length > 1 && (
        <button 
          onClick={() => setIsExpanded(false)}
          className="w-full py-3 text-center text-sm font-bold text-bhasvic-navy hover:bg-gray-50 border-t border-gray-100 transition-colors font-display"
        >
          Collapse Preview
        </button>
      )}
    </div>
  );
};

export default EventPreview;