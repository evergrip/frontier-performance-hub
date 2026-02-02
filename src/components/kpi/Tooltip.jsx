import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ content, children, side = "top" }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />}
      </div>
      
      {isVisible && (
        <div className={`
          absolute z-50 px-3 py-2 text-sm text-white bg-slate-900 rounded-lg shadow-lg
          max-w-xs whitespace-normal
          ${side === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
          ${side === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
          ${side === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
          ${side === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
        `}>
          {content}
          <div className={`
            absolute w-2 h-2 bg-slate-900 transform rotate-45
            ${side === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
            ${side === 'right' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' : ''}
            ${side === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            ${side === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' : ''}
          `} />
        </div>
      )}
    </div>
  );
}