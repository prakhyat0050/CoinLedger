import type {
  Transaction,
  FlowDataPoint,
  FlowStats,
  GasDataPoint,
  GasAnalytics,
  CategoryBreakdown,
  TransactionCategory,
  FinancialInsight,
  WalletHealth,
  WalletSummary,
  TaxRow,
} from '@/types';

type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export function getTimeRangeMs(range: TimeRange): number {
  const now = Date.now();
  switch (range) {
    case '7D': return now - 7 * 24 * 60 * 60 * 1000;
    case '30D': return now - 30 * 24 * 60 * 60 * 1000;
    case '90D': return now - 90 * 24 * 60 * 60 * 1000;
    case '1Y': return now - 365 * 24 * 60 * 60 * 1000;
    case 'ALL': return 0;
  }
}

export function filterTransactionsByTimeRange(
  transactions: Transaction[],
  range: TimeRange,
): Transaction[] {
  const cutoff = getTimeRangeMs(range);
  if (cutoff === 0) return transactions;
  return transactions.filter((tx) => {
    const ts = new Date(tx.timestamp).getTime();
    return ts >= cutoff;
  });
}

export function computeFlowData(
  transactions: Transaction[],
  range: TimeRange,
): FlowDataPoint[] {
  const filtered = filterTransactionsByTimeRange(transactions, range);
  const grouped = new Map<string, { inflow: number; outflow: number }>();

  for (const tx of filtered) {
    const date = tx.timestamp.split('T')[0];
    if (!date) continue;
    const existing = grouped.get(date) || { inflow: 0, outflow: 0 };
    if (tx.usdValue !== null) {
      if (tx.direction === 'in') {
        existing.inflow += tx.usdValue;
      } else if (tx.direction === 'out') {
        existing.outflow += tx.usdValue;
      }
    }
    grouped.set(date, existing);
  }

  // Sort by date and fill gaps
  const sortedDates = Array.from(grouped.keys()).sort();
  if (sortedDates.length === 0) return [];

  const result: FlowDataPoint[] = [];
  const startDate = new Date(sortedDates[0]);
  const endDate = new Date(sortedDates[sortedDates.length - 1]);

  // For large ranges, aggregate by week or month
  const dayDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const aggregateBy = dayDiff > 90 ? 'month' : dayDiff > 21 ? 'week' : 'day';

  if (aggregateBy === 'day') {
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const data = grouped.get(dateStr) || { inflow: 0, outflow: 0 };
      result.push({
        date: dateStr,
        label: current.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (aggregateBy === 'week') {
    // Group by week
    const weekMap = new Map<string, { inflow: number; outflow: number }>();
    for (const [date, val] of grouped.entries()) {
      const d = new Date(date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      const existing = weekMap.get(weekKey) || { inflow: 0, outflow: 0 };
      existing.inflow += val.inflow;
      existing.outflow += val.outflow;
      weekMap.set(weekKey, existing);
    }
    for (const [weekKey, val] of Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      result.push({
        date: weekKey,
        label: new Date(weekKey).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        inflow: val.inflow,
        outflow: val.outflow,
        net: val.inflow - val.outflow,
      });
    }
  } else {
    // Group by month
    const monthMap = new Map<string, { inflow: number; outflow: number }>();
    for (const [date, val] of grouped.entries()) {
      const monthKey = date.slice(0, 7);
      const existing = monthMap.get(monthKey) || { inflow: 0, outflow: 0 };
      existing.inflow += val.inflow;
      existing.outflow += val.outflow;
      monthMap.set(monthKey, existing);
    }
    for (const [monthKey, val] of Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const [year, month] = monthKey.split('-');
      result.push({
        date: monthKey,
        label: new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        inflow: val.inflow,
        outflow: val.outflow,
        net: val.inflow - val.outflow,
      });
    }
  }

  return result;
}

export function computeFlowStats(
  transactions: Transaction[],
  range: TimeRange,
): FlowStats {
  const filtered = filterTransactionsByTimeRange(transactions, range);
  let incomingCount = 0;
  let outgoingCount = 0;
  let totalValue = 0;
  let valueCount = 0;
  let largestIncoming: Transaction | null = null;
  let largestOutgoing: Transaction | null = null;

  for (const tx of filtered) {
    if (tx.direction === 'in') {
      incomingCount++;
      if (tx.usdValue !== null) {
        totalValue += tx.usdValue;
        valueCount++;
        if (!largestIncoming || (tx.usdValue > (largestIncoming.usdValue || 0))) {
          largestIncoming = tx;
        }
      }
    } else if (tx.direction === 'out') {
      outgoingCount++;
      if (tx.usdValue !== null) {
        totalValue += tx.usdValue;
        valueCount++;
        if (!largestOutgoing || (tx.usdValue > (largestOutgoing.usdValue || 0))) {
          largestOutgoing = tx;
        }
      }
    }
  }

  return {
    incomingCount,
    outgoingCount,
    averageTxSize: valueCount > 0 ? totalValue / valueCount : 0,
    largestIncoming,
    largestOutgoing,
  };
}

export function computeGasAnalytics(
  transactions: Transaction[],
  exchangeRate: number | null,
): GasAnalytics {
  let totalGasSpentNative = 0;
  let totalGasSpentUsd = 0;
  let txWithGas = 0;
  let highestGasTx: Transaction | null = null;
  let highestGasCost = 0;
  const gasByDayMap = new Map<string, { gasUsd: number; gasNative: number; txCount: number }>();

  for (const tx of transactions) {
    const gasNative = tx.gasCostInNative;
    totalGasSpentNative += gasNative;
    txWithGas++;

    let gasUsd = tx.gasCostInUsd;
    if (gasUsd === null && exchangeRate) {
      gasUsd = gasNative * exchangeRate;
    }
    if (gasUsd !== null) {
      totalGasSpentUsd += gasUsd;
    }

    if (gasUsd !== null && gasUsd > highestGasCost) {
      highestGasCost = gasUsd;
      highestGasTx = tx;
    }

    // Group by day
    const date = tx.timestamp.split('T')[0];
    if (date) {
      const existing = gasByDayMap.get(date) || { gasUsd: 0, gasNative: 0, txCount: 0 };
      existing.gasUsd += gasUsd || 0;
      existing.gasNative += gasNative;
      existing.txCount++;
      gasByDayMap.set(date, existing);
    }
  }

  const sortedDates = Array.from(gasByDayMap.keys()).sort();
  const gasByDay: GasDataPoint[] = sortedDates.map((date) => {
    const data = gasByDayMap.get(date)!;
    return {
      date,
      label: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      gasUsd: data.gasUsd,
      gasNative: data.gasNative,
      txCount: data.txCount,
    };
  });

  // Group by month
  const gasByMonthMap = new Map<string, { gasUsd: number; gasNative: number; txCount: number }>();
  for (const point of gasByDay) {
    const monthKey = point.date.slice(0, 7);
    const existing = gasByMonthMap.get(monthKey) || { gasUsd: 0, gasNative: 0, txCount: 0 };
    existing.gasUsd += point.gasUsd;
    existing.gasNative += point.gasNative;
    existing.txCount += point.txCount;
    gasByMonthMap.set(monthKey, existing);
  }
  const gasByMonth: GasDataPoint[] = Array.from(gasByMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      return {
        date: monthKey,
        label: new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        gasUsd: data.gasUsd,
        gasNative: data.gasNative,
        txCount: data.txCount,
      };
    });

  return {
    totalGasSpentNative,
    totalGasSpentUsd: totalGasSpentUsd > 0 ? totalGasSpentUsd : null,
    averageGasPerTx: txWithGas > 0 ? totalGasSpentNative / txWithGas : 0,
    highestGasTx,
    gasByDay,
    gasByMonth,
  };
}

const CATEGORY_ORDER: TransactionCategory[] = [
  'income', 'payment', 'swap', 'transfer', 'nft', 'contract', 'gas', 'unknown',
];

export function computeCategoryBreakdowns(transactions: Transaction[]): CategoryBreakdown[] {
  const counts = new Map<TransactionCategory, { count: number; totalUsd: number }>();

  for (const tx of transactions) {
    const existing = counts.get(tx.category) || { count: 0, totalUsd: 0 };
    existing.count++;
    if (tx.usdValue !== null) {
      existing.totalUsd += tx.usdValue;
    }
    counts.set(tx.category, existing);
  }

  const totalTx = transactions.length;
  return CATEGORY_ORDER
    .filter((cat) => counts.has(cat))
    .map((cat) => {
      const data = counts.get(cat)!;
      return {
        category: cat,
        count: data.count,
        totalUsd: data.totalUsd,
        percentage: totalTx > 0 ? (data.count / totalTx) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeInsights(
  transactions: Transaction[],
  summary: WalletSummary,
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  if (transactions.length === 0) return insights;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const last30Days = transactions.filter(
    (tx) => new Date(tx.timestamp).getTime() >= thirtyDaysAgo,
  );

  // Largest outgoing transaction this month
  const last30Outgoing = last30Days.filter((tx) => tx.direction === 'out' && tx.usdValue !== null);
  if (last30Outgoing.length > 0) {
    const largest = last30Outgoing.reduce((max, tx) =>
      (tx.usdValue || 0) > (max.usdValue || 0) ? tx : max,
    );
    insights.push({
      id: 'largest_outgoing_month',
      type: 'neutral',
      titleKey: 'insights.largestOutgoingTitle',
      bodyKey: 'insights.largestOutgoingBody',
      bodyParams: { amount: largest.usdValue?.toFixed(2) || '0', asset: largest.assetSymbol },
    });
  }

  // Gas fee percentage
  if (summary.totalSentUsd > 0 && summary.totalGasUsd > 0) {
    const gasPercent = ((summary.totalGasUsd / (summary.totalSentUsd + summary.totalGasUsd)) * 100).toFixed(1);
    insights.push({
      id: 'gas_percentage',
      type: gasPercent > '10' ? 'warning' : 'info',
      titleKey: 'insights.gasPercentageTitle',
      bodyKey: 'insights.gasPercentageBody',
      bodyParams: { percent: gasPercent, gasAmount: summary.totalGasUsd.toFixed(2) },
    });
  }

  // Average transaction size
  const txsWithValue = transactions.filter((tx) => tx.usdValue !== null);
  if (txsWithValue.length > 0) {
    const avg = txsWithValue.reduce((sum, tx) => sum + (tx.usdValue || 0), 0) / txsWithValue.length;
    insights.push({
      id: 'avg_tx_size',
      type: 'info',
      titleKey: 'insights.avgTxSizeTitle',
      bodyKey: 'insights.avgTxSizeBody',
      bodyParams: { amount: avg.toFixed(2) },
    });
  }

  // Most active token
  const tokenCounts = new Map<string, number>();
  for (const tx of transactions) {
    tokenCounts.set(tx.assetSymbol, (tokenCounts.get(tx.assetSymbol) || 0) + 1);
  }
  const sortedTokens = Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedTokens.length > 0) {
    insights.push({
      id: 'most_active_token',
      type: 'info',
      titleKey: 'insights.mostActiveTokenTitle',
      bodyKey: 'insights.mostActiveTokenBody',
      bodyParams: { token: sortedTokens[0][0], count: sortedTokens[0][1] },
    });
  }

  // Most active period
  const monthCounts = new Map<string, number>();
  for (const tx of transactions) {
    const month = tx.timestamp.slice(0, 7);
    if (month) {
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }
  }
  const sortedMonths = Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedMonths.length > 0) {
    const [year, month] = sortedMonths[0][0].split('-');
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
    insights.push({
      id: 'most_active_period',
      type: 'neutral',
      titleKey: 'insights.mostActivePeriodTitle',
      bodyKey: 'insights.mostActivePeriodBody',
      bodyParams: { period: monthName, count: sortedMonths[0][1] },
    });
  }

  // Net flow indicator
  if (summary.netFlowUsd !== 0) {
    insights.push({
      id: 'net_flow',
      type: summary.netFlowUsd > 0 ? 'positive' : 'warning',
      titleKey: 'insights.netFlowTitle',
      bodyKey: summary.netFlowUsd > 0 ? 'insights.netFlowPositiveBody' : 'insights.netFlowNegativeBody',
      bodyParams: { amount: Math.abs(summary.netFlowUsd).toFixed(2) },
    });
  }

  return insights;
}

export function computeWalletHealth(
  transactions: Transaction[],
  summary: WalletSummary,
): WalletHealth {
  if (transactions.length === 0) {
    return {
      activityLevel: 'low',
      activityScore: 0,
      txFrequency: 0,
      activeDays: 0,
      uniqueContracts: 0,
      tokenActivity: 0,
      totalDays: 0,
    };
  }

  const now = Date.now();
  const firstTxDate = summary.firstTransactionDate ? new Date(summary.firstTransactionDate).getTime() : now;
  const totalDays = Math.max(1, Math.ceil((now - firstTxDate) / (1000 * 60 * 60 * 24)));
  const txFrequency = transactions.length / (totalDays / 30); // tx per 30 days

  // Active days (unique days with at least one transaction)
  const activeDaysSet = new Set<string>();
  for (const tx of transactions) {
    const date = tx.timestamp.split('T')[0];
    if (date) activeDaysSet.add(date);
  }
  const activeDays = activeDaysSet.size;

  // Unique contracts interacted with
  const contractsSet = new Set<string>();
  for (const tx of transactions) {
    if (tx.toAddress && tx.toAddress.toLowerCase() !== summary.address.toLowerCase()) {
      contractsSet.add(tx.toAddress);
    }
    if (tx.createdContract) {
      contractsSet.add(tx.createdContract);
    }
    if (tx.assetContract) {
      contractsSet.add(tx.assetContract);
    }
  }
  const uniqueContracts = contractsSet.size;

  // Token activity (unique tokens)
  const tokensSet = new Set<string>();
  for (const tx of transactions) {
    tokensSet.add(tx.assetSymbol);
  }
  const tokenActivity = tokensSet.size;

  // Score: weighted combination (0-100)
  // Frequency: 40%, Active days: 25%, Contracts: 20%, Token diversity: 15%
  const freqScore = Math.min(40, (txFrequency / 50) * 40);
  const daysScore = Math.min(25, (activeDays / 90) * 25);
  const contractsScore = Math.min(20, (uniqueContracts / 30) * 20);
  const tokenScore = Math.min(15, (tokenActivity / 10) * 15);
  const activityScore = Math.round(freqScore + daysScore + contractsScore + tokenScore);

  let activityLevel: WalletHealth['activityLevel'];
  if (activityScore >= 75) activityLevel = 'very-high';
  else if (activityScore >= 50) activityLevel = 'high';
  else if (activityScore >= 25) activityLevel = 'medium';
  else activityLevel = 'low';

  return {
    activityLevel,
    activityScore,
    txFrequency: Math.round(txFrequency * 10) / 10,
    activeDays,
    uniqueContracts,
    tokenActivity,
    totalDays,
  };
}

export function generateTaxRows(
  transactions: Transaction[],
  startDate?: Date,
  endDate?: Date,
  excludeCategories?: TransactionCategory[],
): TaxRow[] {
  let filtered = transactions;

  if (startDate) {
    filtered = filtered.filter((tx) => new Date(tx.timestamp) >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((tx) => new Date(tx.timestamp) <= endDate);
  }
  if (excludeCategories && excludeCategories.length > 0) {
    filtered = filtered.filter((tx) => !excludeCategories.includes(tx.category));
  }

  return filtered.map((tx) => {
    let notes = '';
    if (tx.categoryConfidence === 'low') {
      notes = 'Needs review — category auto-detected with low confidence';
    } else if (tx.categoryConfidence === 'medium') {
      notes = 'Auto-detected category — verify accuracy';
    }

    return {
      date: tx.timestamp,
      txHash: tx.hash,
      type: tx.direction,
      assetSymbol: tx.assetSymbol,
      amount: tx.humanAmount,
      usdValue: tx.usdValue,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      gasFee: tx.gasCostInNative,
      gasFeeUsd: tx.gasCostInUsd,
      category: tx.category,
      notes,
    };
  });
}

export function generateHumanReadableExplanation(
  tx: Transaction,
  walletAddress: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const direction = tx.direction;
  const amount = tx.humanAmount;
  const asset = tx.assetSymbol;
  const gasCostUsd = tx.gasCostInUsd;
  const gasCostNative = tx.gasCostInNative;
  const nativeSym = tx.nativeSymbol;
  const otherParty = direction === 'in' ? tx.fromAddress : tx.toAddress || '';
  const shortOther = otherParty ? `${otherParty.slice(0, 8)}...${otherParty.slice(-6)}` : '';

  if (direction === 'self') {
    return t('txExplanation.self', { amount: amount.toString(), asset, gasCost: gasCostNative.toFixed(6), native: nativeSym });
  }

  if (tx.category === 'nft') {
    return direction === 'in'
      ? t('txExplanation.nftReceived', { asset, from: shortOther })
      : t('txExplanation.nftSent', { asset, to: shortOther, gas: gasCostNative.toFixed(6), native: nativeSym });
  }

  if (tx.category === 'swap') {
    return t('txExplanation.swap', { asset, amount: amount.toString(), gasCost: gasCostNative.toFixed(6), native: nativeSym });
  }

  if (tx.category === 'contract') {
    return t('txExplanation.contract', { to: shortOther, gasCost: gasCostNative.toFixed(6), native: nativeSym });
  }

  if (gasCostUsd !== null && gasCostUsd > 0) {
    return direction === 'in'
      ? t('txExplanation.receivedWithGas', { amount: amount.toString(), asset, from: shortOther, gasUsd: gasCostUsd.toFixed(2) })
      : t('txExplanation.sentWithGas', { amount: amount.toString(), asset, to: shortOther, gasUsd: gasCostUsd.toFixed(2) });
  }

  return direction === 'in'
    ? t('txExplanation.received', { amount: amount.toString(), asset, from: shortOther })
    : t('txExplanation.sent', { amount: amount.toString(), asset, to: shortOther });
}

export function recategorizeTransaction(
  tx: Transaction,
  newCategory: TransactionCategory,
): Transaction {
  return {
    ...tx,
    category: newCategory,
    categoryConfidence: 'high', // User-confirmed category
  };
}

export function exportToCsv(rows: TaxRow[]): string {
  const headers = ['Date', 'Transaction Hash', 'Type', 'Asset', 'Amount', 'USD Value', 'From', 'To', 'Gas Fee', 'Gas Fee (USD)', 'Category', 'Notes'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = [
      row.date,
      row.txHash,
      row.type,
      row.assetSymbol,
      row.amount.toString(),
      row.usdValue !== null ? row.usdValue.toFixed(2) : '',
      row.fromAddress,
      row.toAddress || '',
      row.gasFee.toString(),
      row.gasFeeUsd !== null ? row.gasFeeUsd.toFixed(2) : '',
      row.category,
      `"${row.notes.replace(/"/g, '""')}"`,
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
