'use client'

import { useState } from 'react'
import { Search, Book, BookmarkPlus, X, Calendar, Globe, Hash, Layers, Building, AlignLeft } from 'lucide-react'

export default function CatalogSearch({ initialBooks }: { initialBooks: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<any>(null)

  const filteredBooks = initialBooks.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn?.includes(searchQuery)
  )

  return (
    <div className="space-y-8 relative">
      {/* Search Input */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for books by title, author, or ISBN..."
          className="appearance-none block w-full pl-12 pr-4 py-4 border border-slate-200/50 shadow-lg shadow-slate-200/50 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white sm:text-lg font-medium transition-all"
        />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBooks.length > 0 ? (
           filteredBooks.map((book) => (
            <div 
              key={book.id} 
              onClick={() => setSelectedBook(book)}
              className="flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all group cursor-pointer"
            >
              {/* Cover Area */}
              <div className="relative aspect-[3/4] bg-slate-100 w-full overflow-hidden flex items-center justify-center p-6">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-contain rounded-md shadow-lg group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Book className="w-16 h-16 text-slate-300" />
                )}
                
                {/* Status Badge overlay */}
                <div className="absolute top-4 right-4">
                  {book.available_copies > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                      Available ({book.available_copies})
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 shadow-sm border border-rose-200">
                      Checked Out
                    </span>
                  )}
                </div>
              </div>
              
              {/* Details Area */}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-slate-900 line-clamp-2 leading-tight mb-1">{book.title}</h3>
                <p className="text-sm font-medium text-indigo-600 mb-4">{book.author}</p>
                
                <div className="mt-auto space-y-3">
                  <div className="text-xs font-mono text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    ISBN: {book.isbn}
                  </div>
                  <button 
                    disabled={book.available_copies === 0}
                    onClick={(e) => e.stopPropagation()} /* Prevent modal from opening if just reserving */
                    className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20"
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    {book.available_copies > 0 ? 'Reserve Book' : 'Join Waitlist'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-200/50">
             <Search className="w-12 h-12 text-slate-300 mb-4" />
             <p className="text-lg font-medium">No books found matching "{searchQuery}"</p>
             <p className="text-sm mt-1">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedBook(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
            
            {/* Close Button (absolute top right) */}
            <button 
                onClick={() => setSelectedBook(null)} 
                className="absolute top-4 right-4 z-10 p-2 bg-white/50 backdrop-blur-md rounded-full text-slate-500 hover:bg-white transition-colors border border-slate-200 shadow-sm"
              >
                <X className="w-5 h-5" />
            </button>

            {/* Modal Cover Area */}
            <div className="w-full md:w-2/5 bg-slate-100 flex items-center justify-center p-8 shrink-0 relative border-b md:border-b-0 md:border-r border-slate-200/60">
               {selectedBook.cover_image_url ? (
                  <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="w-full h-auto max-h-[35vh] md:max-h-[70vh] object-contain rounded-xl shadow-2xl" />
                ) : (
                  <Book className="w-24 h-24 text-slate-300" />
                )}
            </div>

            {/* Modal Content Area */}
            <div className="w-full md:w-3/5 p-6 md:p-10 overflow-y-auto flex flex-col custom-scrollbar">
              
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedBook.available_copies > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                      Available ({selectedBook.available_copies})
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 shadow-sm border border-rose-200">
                      Checked Out
                    </span>
                  )}
                  {selectedBook.genre && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {selectedBook.genre.split(',')[0]}
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 leading-tight">{selectedBook.title}</h2>
                <p className="text-lg font-medium text-indigo-600">{selectedBook.author}</p>
              </div>

              {selectedBook.description && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-slate-400" />
                    Synopsis
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                    {selectedBook.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {selectedBook.publisher && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Publisher</span>
                    <span className="text-sm font-medium text-slate-800">{selectedBook.publisher}</span>
                  </div>
                )}
                {selectedBook.publication_year && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Year</span>
                    <span className="text-sm font-medium text-slate-800">{selectedBook.publication_year}</span>
                  </div>
                )}
                {selectedBook.page_count && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Pages</span>
                    <span className="text-sm font-medium text-slate-800">{selectedBook.page_count}</span>
                  </div>
                )}
                {selectedBook.language && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Language</span>
                    <span className="text-sm font-medium text-slate-800 font-mono tracking-widest">{selectedBook.language}</span>
                  </div>
                )}
                
                <div className="flex flex-col col-span-2 pt-3 border-t border-slate-200/60 mt-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/> ISBN</span>
                  <span className="text-sm font-mono text-slate-800">{selectedBook.isbn}</span>
                </div>
              </div>

              <div className="mt-auto pt-2 flex gap-3">
                 <button 
                  disabled={selectedBook.available_copies === 0}
                  className="w-full flex justify-center items-center py-3.5 px-6 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 text-lg"
                 >
                   <BookmarkPlus className="w-5 h-5 mr-2" />
                   {selectedBook.available_copies > 0 ? 'Reserve This Book' : 'Join Waitlist'}
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

