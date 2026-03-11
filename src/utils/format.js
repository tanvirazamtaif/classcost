import { CURRENCIES } from '../constants/currencies';

export const makeFmt = (currId) => {
  const c = CURRENCIES.find(x => x.id === currId) || CURRENCIES[0];
  return (n) => {
    const v = Number(n || 0) * c.rate;
    return `${c.symbol}${v >= 1000 ? v.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };
};
