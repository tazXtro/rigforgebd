export default function ProductsLoading() {
    return (
        <div className="container py-8">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
                <div className="flex gap-4">
                    <div className="h-10 flex-1 max-w-md bg-muted animate-pulse rounded-lg" />
                    <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
                </div>
            </div>

            <div className="flex gap-8">
                {/* Sidebar Skeleton */}
                <aside className="hidden lg:block w-64 shrink-0 space-y-6">
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-6 w-full bg-muted animate-pulse rounded" />
                    ))}
                </aside>

                {/* Grid Skeleton */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-4/5 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
