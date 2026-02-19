export default function ProductMock() {
  return (
    <div className="animate-fade-up rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Reception 2026 - My Photos</p>
          <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 h-3 w-28 rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200" />
              <div className="h-12 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200" />
              <div className="h-12 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200" />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="h-16 rounded-lg bg-teal-50" />
            <div className="h-16 rounded-lg bg-amber-50" />
            <div className="h-16 rounded-lg bg-rose-50" />
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs text-teal-800">
          Matched 37 photos. Originals stay in your Drive folder.
        </div>
      </div>
    </div>
  );
}
