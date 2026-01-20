export function Loader() {
  return (
    <div className="flex items-center gap-3 text-slate-700">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span className="text-sm">Loading...</span>
    </div>
  )
}

export default Loader