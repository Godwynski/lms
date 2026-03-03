export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 shadow-sm" />
            <div>
              <div className="h-7 w-48 bg-slate-200 rounded-lg mb-2" />
              <div className="h-4 w-32 bg-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40 h-10 bg-slate-200 rounded-xl" />
            <div className="w-32 h-10 bg-slate-200 rounded-xl" />
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm" />
          <div className="w-full sm:w-auto h-12 flex gap-1.5 flex-wrap">
            <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 shadow-sm" />
            <div className="w-16 h-12 bg-white rounded-xl border border-slate-100 shadow-sm" />
            <div className="w-16 h-12 bg-white rounded-xl border border-slate-100 shadow-sm" />
          </div>
          <div className="w-28 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        </div>

        {/* Results summary skeleton */}
        <div className="flex justify-between items-center my-6">
          <div className="w-40 h-4 bg-slate-200 rounded-lg" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[340px]">
              <div className="relative aspect-[3/4] bg-slate-100 w-full" />
              <div className="p-4 flex flex-col gap-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded-md" />
                <div className="w-1/2 h-4 bg-slate-200 rounded-md" />
                <div className="w-full h-3 bg-slate-200 rounded-md mt-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
