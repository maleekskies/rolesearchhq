// Shown instantly while a page's data loads, so a menu click gives feedback
// right away instead of the screen sitting frozen.
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[1500px] animate-pulse px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-2.5 w-28 rounded-full bg-surface" />
      <div className="mt-4 h-11 w-52 rounded-xl bg-surface" />
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-24 rounded-full bg-surface" />
        <div className="h-7 w-28 rounded-full bg-surface" />
        <div className="h-7 w-32 rounded-full bg-surface" />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <div className="h-4 w-40 rounded bg-black/20" />
          <div className="mt-3 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-black/20" />
            <div className="h-7 w-28 rounded-full bg-black/20" />
            <div className="h-7 w-24 rounded-full bg-black/20" />
          </div>
          <div className="mt-5 h-[360px] rounded-[22px] bg-black/20" />
          <div className="mt-4 h-4 w-64 rounded bg-black/20" />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-surface2 p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <div className="h-16 w-32 rounded-xl bg-black/20" />
          <div className="h-6 w-56 rounded bg-black/20" />
          <div className="h-4 w-40 rounded bg-black/20" />
          <div className="mt-2 h-24 rounded-xl bg-black/20" />
          <div className="h-24 rounded-xl bg-black/20" />
          <div className="mt-auto h-11 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  );
}
