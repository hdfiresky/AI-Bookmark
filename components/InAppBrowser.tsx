import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

interface InAppBrowserProps {
  url: string;
  onClose: () => void;
}

const InAppBrowser: React.FC<InAppBrowserProps> = ({ url, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect if it's a touch device on mount
  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touch);
  }, []);

  // Effect for keyboard 'Escape' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Effect for mobile: hide header on iframe interaction
  useEffect(() => {
    if (!isTouchDevice) return;

    const handleBlur = () => {
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          setIsHeaderVisible(false);
        }
      }, 0);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isTouchDevice]);

  
  // Handlers for non-touch (desktop) hover behavior
  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsHeaderVisible(true);
  };
  const handleMouseLeave = () => {
    if (!isTouchDevice) setIsHeaderVisible(false);
  };

  // Handler to copy URL to clipboard
  const handleCopyUrl = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-950 z-[60] animate-fade-in"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mobile-only tap trigger area to show the header */}
      {isTouchDevice && !isHeaderVisible && (
        <div 
          className="absolute top-0 left-0 right-0 h-8 z-20"
          onClick={() => setIsHeaderVisible(true)}
        ></div>
      )}

      <header 
        className={`absolute top-0 left-0 right-0 z-10 flex items-center p-3 bg-gray-850/80 backdrop-blur-sm border-b border-gray-700/50 gap-2 transform transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <button
          onClick={handleCopyUrl}
          className="text-gray-300 text-sm truncate mx-2 px-3 py-2 bg-gray-900/80 rounded-full flex-grow flex items-center justify-center gap-2 transition-colors hover:bg-gray-700/80 disabled:cursor-default"
          disabled={isLoading || isCopied}
        >
          {isLoading ? (
            'Loading...'
          ) : isCopied ? (
            <>
              <Icon name="check" className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Icon name="copy" className="w-4 h-4 text-gray-400" />
              <span className="truncate">{url}</span>
            </>
          )}
        </button>
        
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white flex-shrink-0"
          aria-label="Open in new tab"
        >
          <Icon name="externalLink" className="w-6 h-6" />
        </a>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white flex-shrink-0"
          aria-label="Close browser"
        >
          <Icon name="close" className="w-6 h-6" />
        </button>
      </header>
      <div className="w-full h-full relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className={`w-full h-full border-none ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          title={url}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
        ></iframe>
      </div>
    </div>
  );
};

export default InAppBrowser;