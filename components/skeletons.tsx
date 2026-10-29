// Loading placeholders shaped like the content they stand in for, so the
// swap to real content (see SkeletonSwap) only fits the height, never
// reshuffles the page.

function Line({ className }: { className: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

// The search bar and the round buttons beside it.
export function ToolbarSkeleton({ buttons }: { buttons: number }) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Line className="h-11 flex-1 rounded-xl" />
        {Array.from({ length: buttons }, (_, i) => (
          <Line key={i} className="size-11 shrink-0 rounded-full" />
        ))}
      </div>
      <Line className="mb-4 h-6 w-28" />
    </>
  );
}

// Mirrors ReservationCard; `admin` adds the requester details and the
// decision buttons the admin card has below it.
export function ReservationCardSkeleton({ admin }: { admin?: boolean }) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <Line className="h-5 w-28" />
        <Line className="h-7 w-24 rounded-full" />
      </div>
      <Line className="mt-3 h-7 w-1/2" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Line className="h-6 w-40" />
        <Line className="h-6 w-48" />
        <Line className="h-6 w-56 sm:col-span-2" />
      </div>
      {admin && (
        <>
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
            <Line className="h-6 w-44" />
            <Line className="h-6 w-32" />
            <Line className="h-6 w-20" />
            <Line className="h-5 w-40" />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <Line className="h-12 w-32 rounded-btn" />
            <Line className="h-12 w-28 rounded-btn" />
          </div>
        </>
      )}
    </div>
  );
}

export function ReservationListSkeleton({ admin }: { admin?: boolean }) {
  return (
    <div aria-hidden>
      <ToolbarSkeleton buttons={admin ? 3 : 1} />
      {admin && <Line className="mb-5 h-[3.25rem] rounded-xl" />}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <ReservationCardSkeleton key={i} admin={admin} />
        ))}
      </div>
    </div>
  );
}
