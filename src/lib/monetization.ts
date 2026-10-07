export function splitAdRevenue(netCents: number) {
  if (!Number.isSafeInteger(netCents) || netCents < 0) throw new Error("invalid_amount");
  const developerCents = Math.floor(netCents / 2);
  return { developerCents, platformCents: netCents - developerCents };
}
