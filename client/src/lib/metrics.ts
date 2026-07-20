import type { Property } from "@shared/schema";

export interface PropertyMetrics {
  grossMonthlyIncome: number;
  effectiveGrossIncome: number;
  operatingExpensesMonthly: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  noi: number;
  equity: number;
  capRate: number;
  cashOnCash: number;
  roi: number;
  totalMonthlyExpenses: number;
  appreciation: number;
}

export function computeMetrics(p: Property): PropertyMetrics {
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

  const monthlyRent = num(p.monthlyRent);
  const otherIncome = num(p.otherIncome);
  const vacancyRate = num(p.vacancyRate);

  const grossMonthlyIncome = monthlyRent + otherIncome;
  const vacancyLoss = grossMonthlyIncome * (vacancyRate / 100);
  const effectiveGrossIncome = Math.max(0, grossMonthlyIncome - vacancyLoss);

  const operatingExpensesMonthly =
    num(p.propertyTaxes) +
    num(p.insurance) +
    num(p.maintenance) +
    num(p.hoa) +
    num(p.propertyManagement) +
    num(p.utilities) +
    num(p.capexReserve) +
    num(p.otherExpenses);

  const mortgagePayment = num(p.mortgagePayment);
  const totalMonthlyExpenses = operatingExpensesMonthly + mortgagePayment;

  const monthlyCashFlow = effectiveGrossIncome - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const noi = effectiveGrossIncome * 12 - operatingExpensesMonthly * 12;

  const currentValue = num(p.currentValue);
  const loanBalance = num(p.loanBalance);
  const downPayment = num(p.downPayment);
  const purchasePrice = num(p.purchasePrice);

  const equity = currentValue - loanBalance;
  const appreciation = currentValue - purchasePrice;

  const capRate = currentValue > 0 ? noi / currentValue : 0;
  const cashOnCash = downPayment > 0 ? annualCashFlow / downPayment : 0;
  const roi = equity > 0 ? annualCashFlow / equity : 0;

  return {
    grossMonthlyIncome,
    effectiveGrossIncome,
    operatingExpensesMonthly,
    monthlyCashFlow,
    annualCashFlow,
    noi,
    equity,
    capRate,
    cashOnCash,
    roi,
    totalMonthlyExpenses,
    appreciation,
  };
}

export function sumPortfolio(items: Property[]) {
  const m = items.reduce(
    (acc, p) => {
      const r = computeMetrics(p);
      acc.monthlyRent += p.monthlyRent;
      acc.effectiveGrossIncome += r.effectiveGrossIncome;
      acc.operatingExpensesMonthly += r.operatingExpensesMonthly;
      acc.mortgagePayment += p.mortgagePayment;
      acc.monthlyCashFlow += r.monthlyCashFlow;
      acc.annualCashFlow += r.annualCashFlow;
      acc.noi += r.noi;
      acc.equity += r.equity;
      acc.currentValue += p.currentValue;
      acc.purchasePrice += p.purchasePrice;
      acc.downPayment += p.downPayment;
      acc.appreciation += r.appreciation;
      return acc;
    },
    {
      monthlyRent: 0,
      effectiveGrossIncome: 0,
      operatingExpensesMonthly: 0,
      mortgagePayment: 0,
      monthlyCashFlow: 0,
      annualCashFlow: 0,
      noi: 0,
      equity: 0,
      currentValue: 0,
      purchasePrice: 0,
      downPayment: 0,
      appreciation: 0,
    }
  );

  const avgCapRate = m.currentValue > 0 ? m.noi / m.currentValue : 0;
  const avgCashOnCash = m.downPayment > 0 ? m.annualCashFlow / m.downPayment : 0;

  return { ...m, avgCapRate, avgCashOnCash };
}
