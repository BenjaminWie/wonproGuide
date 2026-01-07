
import React, { useEffect, useRef } from 'react';
import { Document } from '../types';
import { CloseIcon, DocIcon } from './Icons';

interface DocumentDetailProps {
  document: Document;
  onClose: () => void;
  highlightText?: string;
}

const DocumentDetail: React.FC<DocumentDetailProps> = ({ document, onClose, highlightText }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightText && contentRef.current) {
      const mark = contentRef.current.querySelector('mark');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightText]);

  // Simple function to highlight the text within the content
  const renderHighlightedContent = () => {
    if (!highlightText) return document.content;

    const parts = document.content.split(new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    
    return parts.map((part, i) => (
      part.toLowerCase() === highlightText.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-black px-1 rounded-sm shadow-sm animate-pulse">
          {part}
        </mark>
      ) : part
    ));
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
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {document.category} • Hochgeladen am {document.uploadDate}
            </p>
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
