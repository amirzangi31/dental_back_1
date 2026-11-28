// A redesign order bills each service on its own flag.
// Services marked haveRedesign are half the catalog price.
// Services without that flag are free on the redesign.
// A normal order always uses the catalog price.
export const redesignPrice = (
  price: number,
  isRedesign: boolean,
  haveRedesign: boolean,
): number => {
  if (!isRedesign) return price;
  if (!haveRedesign) return 0;
  return price / 2;
};
