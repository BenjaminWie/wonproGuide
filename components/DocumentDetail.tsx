
import React, { useEffect, useRef } from 'react';
import { Document } from '../types';
import { CloseIcon, DocIcon } from './Icons';

interface DocumentDetailProps {
  document: Document;
  onClose: () => void;
  highlightText?: string;
  highlightSection?: string;
}

const DocumentDetail: React.FC<DocumentDetailProps> = ({ document, onClose, highlightText, highlightSection }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
       // Priority 1: Highlight Section
       if (highlightSection) {
          // Attempt to find an element containing the section text that looks like a header or significant block
          const elements = Array.from(contentRef.current.querySelectorAll('p, div, span, mark'));
          const found = elements.find(el => el.textContent?.toLowerCase().includes(highlightSection.toLowerCase()));
          if (found) {
            found.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
       }

       // Priority 2: Highlight Text Quote
       if (highlightText) {
        const mark = contentRef.current.querySelector('mark');
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [highlightText, highlightSection]);

  // Function to highlight both the quote and potentially match section headers loosely
  const renderHighlightedContent = () => {
    let content = document.content;

    // We do a simple split/map approach for highlighting. 
    // Note: Complex nested highlighting requires a more robust parser, keeping it simple here.
    
    if (!highlightText && !highlightSection) return content;

    const parts = [];
    // Very basic tokenizer: split by the highlight text
    // If section highlighting is needed visually, we could wrap matched sections here too, 
    // but usually scrolling to the area is sufficient for context.
    
    if (highlightText) {
        const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const splitContent = content.split(regex);
        return splitContent.map((part, i) => 
            part.toLowerCase() === highlightText.toLowerCase() ? (
                <mark key={i} className="bg-yellow-200 text-black px-1 rounded-sm shadow-sm animate-pulse">
                    {part}
                </mark>
            ) : part
        );
    }

    return content;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] flex flex-col animate-in fade-in duration-500">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <DocIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">{document.name}</h2>
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {document.category} • Hochgeladen am {document.uploadDate}
                </p>
                {highlightSection && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-white bg-black px-2 py-0.5 rounded-full">
                        Springe zu: {highlightSection}
                    </span>
                )}
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full py-16 px-8 sm:px-12">
        <div 
          ref={contentRef}
          className="bg-white shadow-2xl shadow-black/5 rounded-[3rem] p-10 sm:p-20 min-h-[80vh] border border-gray-50"
        >
          <div className="prose prose-lg max-w-none">
            <p className="text-xl sm:text-2xl leading-relaxed text-gray-800 whitespace-pre-wrap font-serif">
              {renderHighlightedContent()}
            </p>
          </div>
        </div>
        
        <div className="mt-12 text-center pb-20">
          <p className="text-sm text-gray-300 italic">Ende des Dokuments</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetail;
