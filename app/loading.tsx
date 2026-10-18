// Shown instantly while a page's data loads, so a menu click gives feedback
// right away instead of the screen sitting frozen.
export default function Loading() {
  return (
    <div className="px-6 py-10 pb-24 md:pb-10 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-44 bg-surface rounded mb-3" />
      <div className="h-4 w-72 max-w-full bg-surface rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface border border-border rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-surface border border-border rounded-lg" />
        ))}
      </div>
    </div>
  );
}
