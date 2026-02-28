'use client'

import { useState } from 'react'
import { Search, Book, BookmarkPlus } from 'lucide-react'

export default function CatalogSearch({ initialBooks }: { initialBooks: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredBooks = initialBooks.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn?.includes(searchQuery)
  )

  return (
    <div className="space-y-8">
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
            <div key={book.id} className="flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all group">
              {/* Cover Area */}
              <div className="relative aspect-[3/4] bg-slate-100 w-full overflow-hidden flex items-center justify-center p-6">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-contain rounded-md shadow-lg group-hover:scale-105 transition-transform duration-500" />
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
    </div>
  )
}
