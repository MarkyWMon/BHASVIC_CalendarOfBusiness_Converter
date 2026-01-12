import React, { useMemo, useState } from 'react';
import { CalendarEvent } from '../types';

interface EventPreviewProps {
  events: CalendarEvent[];
}

const EventPreview: React.FC<EventPreviewProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

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

  const monthOptions = useMemo(() => {
    return groupedEvents.map(([month]) => month);
  }, [groupedEvents]);

  const displayedGroups = useMemo(() => {
    if (selectedMonth !== 'all') {
      return groupedEvents.filter(([month]) => month === selectedMonth);
    }
    return isExpanded ? groupedEvents : groupedEvents.slice(0, 1);
  }, [groupedEvents, selectedMonth, isExpanded]);

  return (
    <div className="bg-white border border-gray-200 shadow-sm mt-8 animate-fade-in">
      <div className="bg-bhasvic-navy p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-white font-display font-bold text-lg leading-tight">Schedule Preview</h3>
          <span className="text-blue-200 text-xs font-light uppercase tracking-widest">{events.length} Total Events</span>
        </div>
        
        <div className="flex items-center w-full sm:w-auto">
          <label htmlFor="month-filter" className="sr-only">Filter by Month</label>
          <div className="relative w-full sm:w-48">
            <select
              id="month-filter"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (e.target.value !== 'all') setIsExpanded(true);
              }}
              className="w-full bg-white/10 text-white border border-white/20 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-bhasvic-red appearance-none cursor-pointer hover:bg-white/20 transition-colors"
            >
              <option value="all" className="text-black">All Months</option>
              {monthOptions.map(month => (
                <option key={month} value={month} className="text-black">{month}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
        {displayedGroups.length > 0 ? (
          displayedGroups.map(([month, monthEvents]) => (
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
          ))
        ) : (
          <div className="p-12 text-center text-gray-400 font-light">
            No events found for the selected criteria.
          </div>
        )}
      </div>
      
      {selectedMonth === 'all' && !isExpanded && groupedEvents.length > 1 && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-full py-3 text-center text-sm font-bold text-bhasvic-navy hover:bg-gray-50 border-t border-gray-100 transition-colors font-display"
        >
          View All {groupedEvents.length} Months
        </button>
      )}
       {selectedMonth === 'all' && isExpanded && groupedEvents.length > 1 && (
        <button 
          onClick={() => {
            setIsExpanded(false);
            window.scrollTo({ top: document.querySelector('.bg-bhasvic-navy')?.getBoundingClientRect().top ?? 0 + window.scrollY - 100, behavior: 'smooth' });
          }}
          className="w-full py-3 text-center text-sm font-bold text-bhasvic-navy hover:bg-gray-50 border-t border-gray-100 transition-colors font-display"
        >
          Collapse Preview
        </button>
      )}
    </div>
  );
};

export default EventPreview;