"use client";

type RouteSkeletonProps = {
  variant?: "default" | "dashboard" | "admin";
};

function Bar({ className }: { className: string }) {
  return <div className={`app-skeleton rounded-full ${className}`} />;
}

function Block({ className }: { className: string }) {
  return <div className={`app-skeleton rounded-3xl ${className}`} />;
}

export default function RouteSkeleton({
  variant = "default",
}: RouteSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-5">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex items-center justify-between">
            <Bar className="h-11 w-11" />
            <Bar className="h-6 w-40" />
            <Bar className="h-11 w-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Block className="h-32" />
            <Block className="h-32" />
            <Block className="h-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-[1.3fr,0.7fr]">
            <Block className="h-[420px]" />
            <div className="space-y-4">
              <Block className="h-48" />
              <Block className="h-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "admin") {
    return (
      <div className="min-h-screen bg-white px-4 py-5">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex items-center justify-between">
            <Bar className="h-10 w-32" />
            <Bar className="h-10 w-44" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Block className="h-28" />
            <Block className="h-28" />
            <Block className="h-28" />
            <Block className="h-28" />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
            <Block className="h-[420px]" />
            <Block className="h-[420px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light px-4 py-5">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <Bar className="h-12 w-12" />
          <Bar className="h-7 w-32" />
          <Bar className="h-12 w-12" />
        </div>
        <Block className="h-[68dvh] min-h-[500px]" />
        <div className="grid grid-cols-2 gap-4">
          <Bar className="h-16" />
          <Bar className="h-16" />
        </div>
      </div>
    </div>
  );
}
