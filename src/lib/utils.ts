const MIST_PER_SUI = 1_000_000_000;

export function mistToSui(mist: string | number | bigint): string {
  const value = Number(mist) / MIST_PER_SUI;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 2) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function timeAgo(timestampMs: string | number): string {
  const seconds = Math.floor(
    (Date.now() - Number(timestampMs)) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
