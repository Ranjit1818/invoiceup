const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");

/**
 * GET /api/analytics
 *
 * Query params (all optional):
 *   ?client=<bill_to name>
 *   &project=<item_desc>
 *   &range=30|90|180|365|all   (days lookback, default all)
 *
 * Returns a comprehensive analytics payload derived from Invoice data.
 */
router.get("/", async (req, res) => {
  try {
    const { client, project, range } = req.query;

    /* ── Base filter ───────────────────────────────────────────────────── */
    const filter = {};
    if (client) filter.bill_to = client;
    if (range && range !== "all") {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number(range));
      filter.createdAt = { $gte: daysAgo };
    }

    /* ── Fetch invoices ────────────────────────────────────────────────── */
    let invoices = await Invoice.find(filter).sort({ createdAt: 1 }).lean();

    // If project filter is applied, filter items within invoices
    if (project) {
      invoices = invoices
        .map((inv) => {
          const filteredItems = inv.items.filter((it) => it.item_desc === project);
          if (filteredItems.length === 0) return null;
          const totalAmount = filteredItems.reduce((s, it) => s + it.qty * it.rate_item, 0);
          return { ...inv, items: filteredItems, totalAmount };
        })
        .filter(Boolean);
    }

    /* ── Unique clients & projects ─────────────────────────────────────── */
    const allInvoices = await Invoice.find({}).lean();
    const clients = [...new Set(allInvoices.map((i) => i.bill_to))].sort();

    let projects = [];
    if (client) {
      const clientInvoices = allInvoices.filter((i) => i.bill_to === client);
      projects = [...new Set(clientInvoices.flatMap((i) => i.items.map((it) => it.item_desc)))].sort();
    } else {
      projects = [...new Set(allInvoices.flatMap((i) => i.items.map((it) => it.item_desc)))].sort();
    }

    /* ── KPIs ──────────────────────────────────────────────────────────── */
    const totalRevenue = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const invoiceCount = invoices.length;
    const avgInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    // Top client by revenue
    const clientRevenueMap = {};
    invoices.forEach((inv) => {
      clientRevenueMap[inv.bill_to] = (clientRevenueMap[inv.bill_to] || 0) + (inv.totalAmount || 0);
    });
    const topClient = Object.entries(clientRevenueMap).sort((a, b) => b[1] - a[1])[0];

    // Growth rate (compare last period vs previous period)
    const now = new Date();
    const midpoint = new Date(now);
    const daysBack = range && range !== "all" ? Number(range) : 90;
    midpoint.setDate(now.getDate() - Math.floor(daysBack / 2));

    const recentRevenue = invoices
      .filter((i) => new Date(i.createdAt) >= midpoint)
      .reduce((s, i) => s + (i.totalAmount || 0), 0);
    const olderRevenue = invoices
      .filter((i) => new Date(i.createdAt) < midpoint)
      .reduce((s, i) => s + (i.totalAmount || 0), 0);
    const growthRate = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;

    // Active projects
    const activeProjects = new Set(invoices.flatMap((i) => i.items.map((it) => it.item_desc)));

    const kpis = {
      totalRevenue,
      invoiceCount,
      avgInvoiceValue,
      topClient: topClient ? { name: topClient[0], revenue: topClient[1] } : null,
      growthRate: Math.round(growthRate * 10) / 10,
      activeProjects: activeProjects.size,
    };

    /* ── Revenue Time Series (monthly) ─────────────────────────────────── */
    const monthlyMap = {};
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + (inv.totalAmount || 0);
    });
    const revenueTimeSeries = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }));

    /* ── Client Revenue Breakdown ──────────────────────────────────────── */
    const clientRevenue = Object.entries(clientRevenueMap)
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    /* ── Project Revenue Breakdown ─────────────────────────────────────── */
    const projectRevenueMap = {};
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const rev = it.qty * it.rate_item;
        projectRevenueMap[it.item_desc] = (projectRevenueMap[it.item_desc] || 0) + rev;
      });
    });
    const projectRevenue = Object.entries(projectRevenueMap)
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    /* ── Monthly Comparison (for Waterfall) ─────────────────────────────── */
    const monthlyComparison = [];
    for (let i = 1; i < revenueTimeSeries.length; i++) {
      monthlyComparison.push({
        month: revenueTimeSeries[i].month,
        change: Math.round((revenueTimeSeries[i].revenue - revenueTimeSeries[i - 1].revenue) * 100) / 100,
        previous: revenueTimeSeries[i - 1].revenue,
        current: revenueTimeSeries[i].revenue,
      });
    }

    /* ── Item Distribution (Scatter / Bubble) ──────────────────────────── */
    const itemDistribution = [];
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        itemDistribution.push({
          desc: it.item_desc,
          qty: it.qty,
          rate: it.rate_item,
          amount: it.qty * it.rate_item,
          client: inv.bill_to,
        });
      });
    });

    /* ── Tax Breakdown ─────────────────────────────────────────────────── */
    const taxMap = {};
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const taxLabel = `${it.tax}%`;
        const taxAmt = it.qty * it.rate_item * (it.tax / 100);
        if (!taxMap[taxLabel]) taxMap[taxLabel] = { taxable: 0, tax: 0 };
        taxMap[taxLabel].taxable += it.qty * it.rate_item;
        taxMap[taxLabel].tax += taxAmt;
      });
    });
    const taxBreakdown = Object.entries(taxMap)
      .map(([label, data]) => ({
        label,
        taxable: Math.round(data.taxable * 100) / 100,
        tax: Math.round(data.tax * 100) / 100,
      }))
      .sort((a, b) => b.taxable - a.taxable);

    /* ── Invoice Value Ranges (Funnel) ─────────────────────────────────── */
    const ranges = [
      { label: "₹1L+", min: 100000, max: Infinity },
      { label: "₹50K–1L", min: 50000, max: 100000 },
      { label: "₹25K–50K", min: 25000, max: 50000 },
      { label: "₹10K–25K", min: 10000, max: 25000 },
      { label: "₹5K–10K", min: 5000, max: 10000 },
      { label: "₹0–5K", min: 0, max: 5000 },
    ];
    const invoiceValueRanges = ranges.map((r) => ({
      label: r.label,
      count: invoices.filter((i) => i.totalAmount >= r.min && i.totalAmount < r.max).length,
    }));

    /* ── Client Growth (Radar) ─────────────────────────────────────────── */
    const clientMetrics = {};
    invoices.forEach((inv) => {
      if (!clientMetrics[inv.bill_to]) {
        clientMetrics[inv.bill_to] = { revenue: 0, invoices: 0, items: 0, avgValue: 0, projects: new Set() };
      }
      clientMetrics[inv.bill_to].revenue += inv.totalAmount || 0;
      clientMetrics[inv.bill_to].invoices += 1;
      clientMetrics[inv.bill_to].items += inv.items.length;
      inv.items.forEach((it) => clientMetrics[inv.bill_to].projects.add(it.item_desc));
    });
    const clientGrowth = Object.entries(clientMetrics)
      .map(([name, m]) => ({
        name,
        revenue: Math.round(m.revenue),
        invoiceCount: m.invoices,
        itemCount: m.items,
        projectCount: m.projects.size,
        avgValue: Math.round(m.revenue / m.invoices),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    /* ── Weekday × Month Heatmap ───────────────────────────────────────── */
    const weekdayHeatmap = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      weekdayHeatmap.push({
        day: dayNames[d.getDay()],
        dayIndex: d.getDay(),
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        amount: inv.totalAmount || 0,
      });
    });

    /* ── Top Items — Pareto ────────────────────────────────────────────── */
    const topItems = [...projectRevenue].slice(0, 15);
    let cumulative = 0;
    topItems.forEach((item) => {
      cumulative += item.revenue;
      item.cumulative = Math.round(cumulative * 100) / 100;
      item.cumulativePercent = totalRevenue > 0 ? Math.round((cumulative / totalRevenue) * 1000) / 10 : 0;
    });

    /* ── Payment Flow (Sankey-like) ────────────────────────────────────── */
    const paymentFlow = [];
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        paymentFlow.push({
          from: inv.bill_to,
          to: it.item_desc,
          value: Math.round(it.qty * it.rate_item * 100) / 100,
        });
      });
    });
    // Aggregate flows
    const flowMap = {};
    paymentFlow.forEach((f) => {
      const key = `${f.from}→${f.to}`;
      flowMap[key] = (flowMap[key] || 0) + f.value;
    });
    const aggregatedFlows = Object.entries(flowMap)
      .map(([key, value]) => {
        const [from, to] = key.split("→");
        return { from, to, value: Math.round(value * 100) / 100 };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    /* ── Material Categories ───────────────────────────────────────────── */
    const materialMap = {};
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        if (!materialMap[it.item_desc]) {
          materialMap[it.item_desc] = { totalQty: 0, totalValue: 0, invoiceCount: 0 };
        }
        materialMap[it.item_desc].totalQty += it.qty;
        materialMap[it.item_desc].totalValue += it.qty * it.rate_item;
        materialMap[it.item_desc].invoiceCount += 1;
      });
    });
    const materialCategories = Object.entries(materialMap)
      .map(([name, data]) => ({
        name,
        totalQty: data.totalQty,
        totalValue: Math.round(data.totalValue * 100) / 100,
        invoiceCount: data.invoiceCount,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    /* ── Work Program Timeline ─────────────────────────────────────────── */
    const wpMap = {};
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      inv.items.forEach((it) => {
        if (!wpMap[it.item_desc]) wpMap[it.item_desc] = {};
        wpMap[it.item_desc][monthKey] = (wpMap[it.item_desc][monthKey] || 0) + it.qty * it.rate_item;
      });
    });
    const allMonths = [...new Set(invoices.map((i) => {
      const d = new Date(i.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }))].sort();
    const workProgramTimeline = {
      months: allMonths,
      programs: Object.entries(wpMap)
        .map(([name, data]) => ({
          name,
          values: allMonths.map((m) => Math.round((data[m] || 0) * 100) / 100),
        }))
        .sort((a, b) => {
          const totalA = a.values.reduce((s, v) => s + v, 0);
          const totalB = b.values.reduce((s, v) => s + v, 0);
          return totalB - totalA;
        })
        .slice(0, 10),
    };

    /* ── Profitability by Client ───────────────────────────────────────── */
    const profitabilityByClient = clientRevenue.map((c) => {
      const clientInvs = invoices.filter((i) => i.bill_to === c.name);
      const totalItems = clientInvs.reduce((s, i) => s + i.items.length, 0);
      return {
        name: c.name,
        revenue: c.revenue,
        invoiceCount: clientInvs.length,
        avgItemsPerInvoice: totalItems > 0 ? Math.round((totalItems / clientInvs.length) * 10) / 10 : 0,
        revenueShare: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 1000) / 10 : 0,
      };
    });

    /* ── Calendar Heatmap Data ─────────────────────────────────────────── */
    const calendarMap = {};
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const key = d.toISOString().split("T")[0];
      if (!calendarMap[key]) calendarMap[key] = { count: 0, revenue: 0 };
      calendarMap[key].count += 1;
      calendarMap[key].revenue += inv.totalAmount || 0;
    });
    const calendarHeatmap = Object.entries(calendarMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    /* ── Response ──────────────────────────────────────────────────────── */
    res.json({
      clients,
      projects,
      kpis,
      revenueTimeSeries,
      clientRevenue,
      projectRevenue,
      monthlyComparison,
      itemDistribution,
      taxBreakdown,
      invoiceValueRanges,
      clientGrowth,
      weekdayHeatmap,
      topItems,
      paymentFlow: aggregatedFlows,
      materialCategories,
      workProgramTimeline,
      profitabilityByClient,
      calendarHeatmap,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});

module.exports = router;
