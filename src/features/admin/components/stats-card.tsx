interface StatsCardProps {
  label: string;
  value: number;
  loading?: boolean;
}

export function StatsCard({ label, value, loading }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-cave-ash bg-cave-stone p-6">
      <p className="font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-cave-rock" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-cave-white">{value}</p>
      )}
    </div>
  );
}
