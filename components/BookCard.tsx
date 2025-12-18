
import React from 'react';
import { Book, Topic } from '../types';

interface BookCardProps {
  book: Book;
  matchedTopics?: Topic[];
  onClick: (book: Book) => void;
  onPlay: (book: Book) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, matchedTopics = [], onClick, onPlay, isFavorite, onToggleFavorite }) => {
  return (
    <div 
      className="group flex flex-col gap-2 md:gap-4 p-2 md:p-3 rounded-2xl md:rounded-[40px] glass-panel transition-all duration-500 cursor-pointer hover:-translate-y-1 md:hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] border-transparent hover:border-primary/30 relative h-fit"
      onClick={() => onClick(book)}
    >
      {/* Quick Favorite Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`absolute top-3 right-3 md:top-6 md:right-6 z-20 size-8 md:size-10 rounded-lg md:rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all ${isFavorite ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20' : 'bg-black/20 text-white opacity-0 group-hover:opacity-100'}`}
      >
        <span className={`material-symbols-outlined text-[16px] md:text-[20px] ${isFavorite ? 'fill-1' : ''}`}>favorite</span>
      </button>

      <div className="relative w-full aspect-[1/1.5] rounded-xl md:rounded-[32px] overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-800">
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
          <button 
            onClick={(e) => { e.stopPropagation(); onPlay(book); }}
            className="size-10 md:size-16 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(14,165,233,0.4)] transform scale-50 group-hover:scale-100 transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl md:text-4xl">play_arrow</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-1 md:space-y-2 px-1 md:px-2 pb-1 md:pb-2">
        <h3 className="text-slate-900 dark:text-white text-[15px] sm:text-[16px] md:text-[18px] font-bold line-clamp-2 group-hover:text-primary transition-colors leading-[1.2] min-h-[2.4em] overflow-hidden">
          {book.title}
        </h3>
        <div className="flex items-center justify-between opacity-70">
          <p className="text-[10px] md:text-xs truncate font-medium max-w-[70%]">{book.author}</p>
          <span className="text-[10px] md:text-[12px] font-bold text-primary shrink-0">{book.duration.split(' ')[0]}s</span>
        </div>

        {/* Eşleşen Konular (Arama sırasında görünür) */}
        {matchedTopics.length > 0 && (
          <div className="mt-2 space-y-1 animate-fade-in border-t border-primary/10 pt-2">
            <p className="text-[9px] md:text-[11px] font-bold text-primary uppercase tracking-tighter opacity-70">Eşleşen Konular:</p>
            <div className="flex flex-col gap-1 max-h-[50px] md:max-h-[70px] overflow-hidden">
               {matchedTopics.slice(0, 2).map(topic => (
                 <div key={topic.id} className="text-[9px] md:text-[11px] opacity-70 flex items-center gap-1 truncate">
                   <span className="material-symbols-outlined text-[10px] md:text-[14px] text-primary">radio_button_checked</span>
                   <span className="truncate font-medium">{topic.title}</span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
