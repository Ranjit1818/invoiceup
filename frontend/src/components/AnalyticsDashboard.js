import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, Users, FileText, IndianRupee,
  Filter, RefreshCw, ChevronDown, Activity, Target, Layers,
  GitBranch, Calendar, Package, Zap,
  ArrowUpRight, AlertCircle, Lightbulb, Star,
  DollarSign, Briefcase,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Filler, Tooltip, Legend, Title,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Radar, Scatter, Bubble } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

/* ── Register Chart.js modules ──────────────────────────────────────────── */
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Filler, Tooltip, Legend, Title,
  ChartDataLabels
);

/* ── Color Palette ──────────────────────────────────────────────────────── */
const COLORS = {
  primary: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"],
  vivid: [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#a855f7", "#d946ef", "#84cc16", "#10b981", "#0ea5e9",
    "#f59e0b", "#ef4444", "#64748b", "#6d28d9", "#059669",
  ],
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#94a3b8",
  gradients: {
    revenue: ["rgba(99,102,241,0.25)", "rgba(99,102,241,0.01)"],
    area: ["rgba(139,92,246,0.2)", "rgba(139,92,246,0.01)"],
  },
};

const formatCurrency = (v) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};
const formatFull = (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo) - 1]} ${y.slice(2)}`;
};

/* ── Shared chart defaults ──────────────────────────────────────────────── */
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: { display: false },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.92)",
      titleFont: { family: "'Inter', sans-serif", size: 12, weight: "600" },
      bodyFont: { family: "'Inter', sans-serif", size: 11 },
      padding: 12,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 4,
    },
  },
};

/* ── Animated Counter Hook ──────────────────────────────────────────────── */
const useAnimatedCounter = (end, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
};

/* ── KPI Card ───────────────────────────────────────────────────────────── */
const KPICard = ({ icon: Icon, title, value, subtitle, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card p-5 sm:p-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 ${color} -translate-y-8 translate-x-8 group-hover:opacity-30 transition-opacity`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
        <Icon size={18} className={color.replace("bg-", "text-")} />
      </div>
    </div>
    <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{value}</p>
    <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{title}</p>
    {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
  </motion.div>
);

/* ── Chart Card Wrapper ─────────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, className = "", delay = 0, fullWidth = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className={`glass-card p-5 sm:p-6 ${fullWidth ? "col-span-1 lg:col-span-2" : ""} ${className}`}
  >
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="relative" style={{ minHeight: 280 }}>
      {children}
    </div>
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const AnalyticsDashboard = () => {
  const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://invoiceupdate.vercel.app";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  /* ── Fetch Analytics ────────────────────────────────────────────────── */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append("client", selectedClient);
      if (selectedProject) params.append("project", selectedProject);
      if (dateRange !== "all") params.append("range", dateRange);
      const res = await fetch(`${API_URL}/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, selectedClient, selectedProject, dateRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);
    setSelectedProject("");
  };

  const resetFilters = () => {
    setSelectedClient("");
    setSelectedProject("");
    setDateRange("all");
  };

  /* ── Animated KPI values ────────────────────────────────────────────── */
  const animRevenue = useAnimatedCounter(data?.kpis?.totalRevenue || 0);
  const animCount = useAnimatedCounter(data?.kpis?.invoiceCount || 0, 800);
  const animAvg = useAnimatedCounter(data?.kpis?.avgInvoiceValue || 0);
  const animProjects = useAnimatedCounter(data?.kpis?.activeProjects || 0, 800);

  /* ── Memoized chart configs ─────────────────────────────────────────── */

  // 1. COMBO CHART — Revenue Bars + Trend Line
  const comboChartData = useMemo(() => {
    if (!data?.revenueTimeSeries?.length) return null;
    const labels = data.revenueTimeSeries.map((d) => monthLabel(d.month));
    const revenues = data.revenueTimeSeries.map((d) => d.revenue);
    // Moving average for trend
    const trend = revenues.map((_, i) => {
      const window = revenues.slice(Math.max(0, i - 2), i + 1);
      return window.reduce((a, b) => a + b, 0) / window.length;
    });
    return {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Monthly Revenue",
          data: revenues,
          backgroundColor: revenues.map((_, i) =>
            `hsla(${235 + i * 3}, 70%, 60%, 0.75)`
          ),
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.65,
        },
        {
          type: "line",
          label: "Trend",
          data: trend,
          borderColor: "#f97316",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.4,
          borderDash: [],
        },
      ],
    };
  }, [data?.revenueTimeSeries]);

  // 2. DONUT CHART — Client Revenue Share
  const donutData = useMemo(() => {
    if (!data?.clientRevenue?.length) return null;
    return {
      labels: data.clientRevenue.map((c) => c.name),
      datasets: [{
        data: data.clientRevenue.map((c) => c.revenue),
        backgroundColor: COLORS.vivid.slice(0, data.clientRevenue.length),
        borderWidth: 2,
        borderColor: "#fff",
        hoverBorderWidth: 3,
        hoverOffset: 8,
      }],
    };
  }, [data?.clientRevenue]);

  // 3. STACKED BAR — Client Revenue per Month
  const stackedBarData = useMemo(() => {
    if (!data?.revenueTimeSeries?.length || !data?.clientRevenue?.length) return null;
    const months = data.revenueTimeSeries.map((d) => d.month);
    const topClients = data.clientRevenue.slice(0, 6).map((c) => c.name);
    // We need per-client-per-month data — derive from raw
    const clientMonthly = {};
    topClients.forEach((c) => { clientMonthly[c] = {}; months.forEach((m) => { clientMonthly[c][m] = 0; }); });
    // Approximate from available data: distribute client revenue proportionally across months
    if (data.profitabilityByClient) {
      data.profitabilityByClient.forEach((c) => {
        if (topClients.includes(c.name)) {
          const share = data.revenueTimeSeries.length > 0 ? c.revenue / data.revenueTimeSeries.length : 0;
          months.forEach((m) => { clientMonthly[c.name][m] = share; });
        }
      });
    }
    return {
      labels: months.map(monthLabel),
      datasets: topClients.map((client, i) => ({
        label: client,
        data: months.map((m) => Math.round(clientMonthly[client][m] || 0)),
        backgroundColor: COLORS.vivid[i],
        borderRadius: 4,
        borderSkipped: false,
      })),
    };
  }, [data?.revenueTimeSeries, data?.clientRevenue, data?.profitabilityByClient]);

  // 4. HORIZONTAL BAR — Top Projects
  const horizontalBarData = useMemo(() => {
    if (!data?.projectRevenue?.length) return null;
    const top = data.projectRevenue.slice(0, 10);
    return {
      labels: top.map((p) => p.name.length > 30 ? p.name.slice(0, 28) + "…" : p.name),
      datasets: [{
        label: "Revenue",
        data: top.map((p) => p.revenue),
        backgroundColor: top.map((_, i) => `hsla(${250 - i * 15}, 65%, 55%, 0.8)`),
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.7,
      }],
    };
  }, [data?.projectRevenue]);

  // 5. AREA CHART — Cumulative Revenue
  const areaChartData = useMemo(() => {
    if (!data?.revenueTimeSeries?.length) return null;
    let cumulative = 0;
    const cumulativeData = data.revenueTimeSeries.map((d) => {
      cumulative += d.revenue;
      return cumulative;
    });
    return {
      labels: data.revenueTimeSeries.map((d) => monthLabel(d.month)),
      datasets: [{
        label: "Cumulative Revenue",
        data: cumulativeData,
        borderColor: "#8b5cf6",
        borderWidth: 2.5,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
          g.addColorStop(0, "rgba(139,92,246,0.25)");
          g.addColorStop(1, "rgba(139,92,246,0.02)");
          return g;
        },
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      }],
    };
  }, [data?.revenueTimeSeries]);

  // 6. WATERFALL CHART (simulated via bar)
  const waterfallData = useMemo(() => {
    if (!data?.monthlyComparison?.length) return null;
    return {
      labels: data.monthlyComparison.map((m) => monthLabel(m.month)),
      datasets: [{
        label: "Change",
        data: data.monthlyComparison.map((m) => m.change),
        backgroundColor: data.monthlyComparison.map((m) =>
          m.change >= 0 ? "rgba(34,197,94,0.75)" : "rgba(239,68,68,0.75)"
        ),
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
  }, [data?.monthlyComparison]);

  // 7. FUNNEL (horizontal bar sorted)
  const funnelData = useMemo(() => {
    if (!data?.invoiceValueRanges?.length) return null;
    return {
      labels: data.invoiceValueRanges.map((r) => r.label),
      datasets: [{
        label: "Invoices",
        data: data.invoiceValueRanges.map((r) => r.count),
        backgroundColor: [
          "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
        ],
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.8,
      }],
    };
  }, [data?.invoiceValueRanges]);

  // 8. RADAR — Client Comparison
  const radarData = useMemo(() => {
    if (!data?.clientGrowth?.length) return null;
    const top = data.clientGrowth.slice(0, 5);
    const maxRevenue = Math.max(...top.map((c) => c.revenue)) || 1;
    const maxInv = Math.max(...top.map((c) => c.invoiceCount)) || 1;
    const maxItems = Math.max(...top.map((c) => c.itemCount)) || 1;
    const maxProj = Math.max(...top.map((c) => c.projectCount)) || 1;
    const maxAvg = Math.max(...top.map((c) => c.avgValue)) || 1;
    return {
      labels: ["Revenue", "Invoices", "Items", "Projects", "Avg Value"],
      datasets: top.map((client, i) => ({
        label: client.name,
        data: [
          (client.revenue / maxRevenue) * 100,
          (client.invoiceCount / maxInv) * 100,
          (client.itemCount / maxItems) * 100,
          (client.projectCount / maxProj) * 100,
          (client.avgValue / maxAvg) * 100,
        ],
        borderColor: COLORS.vivid[i],
        backgroundColor: COLORS.vivid[i].replace(")", ",0.1)").replace("rgb", "rgba"),
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.vivid[i],
      })),
    };
  }, [data?.clientGrowth]);

  // 9. SCATTER — Qty vs Rate
  const scatterData = useMemo(() => {
    if (!data?.itemDistribution?.length) return null;
    const clientGroups = {};
    data.itemDistribution.forEach((it) => {
      if (!clientGroups[it.client]) clientGroups[it.client] = [];
      clientGroups[it.client].push({ x: it.qty, y: it.rate });
    });
    return {
      datasets: Object.entries(clientGroups).slice(0, 8).map(([client, points], i) => ({
        label: client,
        data: points,
        backgroundColor: COLORS.vivid[i] + "99",
        borderColor: COLORS.vivid[i],
        borderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 9,
      })),
    };
  }, [data?.itemDistribution]);

  // 10. BUBBLE — Client Value Mapping
  const bubbleData = useMemo(() => {
    if (!data?.clientGrowth?.length) return null;
    const maxRev = Math.max(...data.clientGrowth.map((c) => c.revenue)) || 1;
    return {
      datasets: data.clientGrowth.slice(0, 8).map((client, i) => ({
        label: client.name,
        data: [{
          x: client.invoiceCount,
          y: client.avgValue,
          r: Math.max(6, (client.revenue / maxRev) * 30),
        }],
        backgroundColor: COLORS.vivid[i] + "80",
        borderColor: COLORS.vivid[i],
        borderWidth: 2,
      })),
    };
  }, [data?.clientGrowth]);

  // 11. PIE — Tax Breakdown
  const pieData = useMemo(() => {
    if (!data?.taxBreakdown?.length) return null;
    return {
      labels: data.taxBreakdown.map((t) => t.label),
      datasets: [{
        data: data.taxBreakdown.map((t) => t.taxable),
        backgroundColor: COLORS.vivid.slice(0, data.taxBreakdown.length),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    };
  }, [data?.taxBreakdown]);

  // 12. STACKED AREA — Work Program Timeline
  const stackedAreaData = useMemo(() => {
    if (!data?.workProgramTimeline?.months?.length) return null;
    return {
      labels: data.workProgramTimeline.months.map(monthLabel),
      datasets: data.workProgramTimeline.programs.slice(0, 6).map((prog, i) => ({
        label: prog.name.length > 25 ? prog.name.slice(0, 23) + "…" : prog.name,
        data: prog.values,
        borderColor: COLORS.vivid[i],
        backgroundColor: COLORS.vivid[i] + "30",
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
      })),
    };
  }, [data?.workProgramTimeline]);

  // 13. PARETO — Top Items
  const paretoData = useMemo(() => {
    if (!data?.topItems?.length) return null;
    return {
      labels: data.topItems.map((it) => it.name.length > 20 ? it.name.slice(0, 18) + "…" : it.name),
      datasets: [
        {
          type: "bar",
          label: "Revenue",
          data: data.topItems.map((it) => it.revenue),
          backgroundColor: data.topItems.map((_, i) => COLORS.vivid[i % COLORS.vivid.length] + "B0"),
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: "y",
          barPercentage: 0.7,
        },
        {
          type: "line",
          label: "Cumulative %",
          data: data.topItems.map((it) => it.cumulativePercent),
          borderColor: "#f97316",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#f97316",
          yAxisID: "y1",
        },
      ],
    };
  }, [data?.topItems]);

  // 14. LOLLIPOP (bar with thin bars) — Material Requisition
  const lollipopData = useMemo(() => {
    if (!data?.materialCategories?.length) return null;
    const top = data.materialCategories.slice(0, 12);
    return {
      labels: top.map((m) => m.name.length > 25 ? m.name.slice(0, 23) + "…" : m.name),
      datasets: [{
        label: "Total Quantity",
        data: top.map((m) => m.totalQty),
        backgroundColor: top.map((_, i) => COLORS.vivid[i]),
        borderRadius: 20,
        borderSkipped: false,
        barPercentage: 0.35,
      }],
    };
  }, [data?.materialCategories]);

  // 15. BULLET (horizontal bar with target) — Revenue per Client vs Average
  const bulletData = useMemo(() => {
    if (!data?.profitabilityByClient?.length) return null;
    const top = data.profitabilityByClient.slice(0, 8);
    const avg = data.kpis?.avgInvoiceValue || 0;
    return {
      labels: top.map((c) => c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name),
      datasets: [
        {
          label: "Revenue",
          data: top.map((c) => c.revenue),
          backgroundColor: top.map((_, i) => COLORS.vivid[i] + "CC"),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
        },
        {
          label: "Avg Invoice",
          data: top.map(() => avg * top[0]?.invoiceCount || 0),
          backgroundColor: "rgba(148,163,184,0.25)",
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.85,
        },
      ],
    };
  }, [data?.profitabilityByClient, data?.kpis]);

  /* ── Gauge value ────────────────────────────────────────────────────── */
  const gaugePercent = useMemo(() => {
    if (!data?.kpis) return 0;
    // Target = highest monthly revenue × 12 (annual projection)
    const maxMonthly = data.revenueTimeSeries?.reduce((m, d) => Math.max(m, d.revenue), 0) || 1;
    const target = maxMonthly * 12;
    return Math.min(100, Math.round((data.kpis.totalRevenue / target) * 100));
  }, [data?.kpis, data?.revenueTimeSeries]);

  /* ── Business Insights ──────────────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!data?.kpis || !data?.clientRevenue?.length) return [];
    const ins = [];
    const topC = data.clientRevenue[0];
    const totalR = data.kpis.totalRevenue;
    if (topC && totalR > 0) {
      const share = Math.round((topC.revenue / totalR) * 100);
      if (share > 50) {
        ins.push({ type: "warning", icon: AlertCircle, text: `Client concentration risk: "${topC.name}" accounts for ${share}% of total revenue. Consider diversifying your client base.` });
      } else {
        ins.push({ type: "success", icon: Star, text: `Healthy client distribution. Top client "${topC.name}" represents ${share}% of revenue.` });
      }
    }
    if (data.kpis.growthRate > 0) {
      ins.push({ type: "success", icon: TrendingUp, text: `Revenue is growing at ${data.kpis.growthRate}% — maintain momentum by upselling to existing clients.` });
    } else if (data.kpis.growthRate < 0) {
      ins.push({ type: "warning", icon: TrendingDown, text: `Revenue declined by ${Math.abs(data.kpis.growthRate)}%. Review pricing strategy and client acquisition pipeline.` });
    }
    if (data.materialCategories?.length > 0) {
      const topMat = data.materialCategories[0];
      ins.push({ type: "info", icon: Lightbulb, text: `Top service/material: "${topMat.name}" generated ${formatFull(topMat.totalValue)} across ${topMat.invoiceCount} invoices. Consider expanding this offering.` });
    }
    if (data.kpis.activeProjects > 5) {
      ins.push({ type: "success", icon: Layers, text: `${data.kpis.activeProjects} active projects indicate a diversified portfolio. Great for business stability.` });
    }
    if (data.clientRevenue?.length >= 3) {
      const bottom = data.clientRevenue.slice(-2);
      ins.push({ type: "info", icon: Target, text: `Growth opportunity: Clients "${bottom.map(b => b.name).join('" & "')}" have low revenue. Targeted engagement could boost their contribution.` });
    }
    return ins;
  }, [data]);

  /* ── Sankey-like Flow Table ─────────────────────────────────────────── */
  const flowData = data?.paymentFlow || [];

  /* ── Calendar Heatmap Data ──────────────────────────────────────────── */
  const calendarData = data?.calendarHeatmap || [];

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */

  if (error) {
    return (
      <div className="page-gradient min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Failed to Load Analytics</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="btn-primary text-sm px-6 py-2.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-300/40">
                <BarChart3 className="text-white" size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient tracking-tight">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-slate-400 text-sm ml-14">
              Deep business intelligence from your invoice data
            </p>
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="btn-secondary text-sm shrink-0"
          >
            <Filter size={15} />
            Filters
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
        </motion.div>

        {/* ── Filters Panel ────────────────────────────────────────────── */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="glass-card p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Client */}
                  <div>
                    <label className="label-text"><Users size={10} className="inline mr-1" />Client</label>
                    <select
                      value={selectedClient}
                      onChange={handleClientChange}
                      className="input-field"
                    >
                      <option value="">All Clients</option>
                      {data?.clients?.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {/* Project */}
                  <div>
                    <label className="label-text"><Briefcase size={10} className="inline mr-1" />Project</label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="input-field"
                      disabled={!selectedClient && data?.projects?.length === 0}
                    >
                      <option value="">All Projects</option>
                      {data?.projects?.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  {/* Date Range */}
                  <div>
                    <label className="label-text"><Calendar size={10} className="inline mr-1" />Date Range</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="input-field"
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="180">Last 6 Months</option>
                      <option value="365">Last 1 Year</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                  {/* Reset */}
                  <div className="flex items-end">
                    <button onClick={resetFilters} className="btn-ghost w-full text-sm py-3">
                      <RefreshCw size={14} /> Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading State ────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            >
              <Activity size={36} className="text-indigo-500" />
            </motion.div>
            <p className="text-sm text-slate-400 font-medium">Crunching your data...</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
              <KPICard
                icon={IndianRupee} title="Total Revenue"
                value={formatCurrency(animRevenue)}
                subtitle={formatFull(data.kpis.totalRevenue)}
                color="bg-indigo-500" delay={0.05}
              />
              <KPICard
                icon={FileText} title="Invoices"
                value={animCount}
                subtitle={`${data.kpis.invoiceCount} total`}
                color="bg-blue-500" delay={0.1}
              />
              <KPICard
                icon={DollarSign} title="Avg Value"
                value={formatCurrency(animAvg)}
                subtitle="Per invoice"
                color="bg-violet-500" delay={0.15}
              />
              <KPICard
                icon={Users} title="Top Client"
                value={data.kpis.topClient?.name?.split(" ")[0] || "—"}
                subtitle={data.kpis.topClient ? formatFull(data.kpis.topClient.revenue) : ""}
                color="bg-emerald-500" delay={0.2}
              />
              <KPICard
                icon={data.kpis.growthRate >= 0 ? TrendingUp : TrendingDown}
                title="Growth"
                value={`${data.kpis.growthRate >= 0 ? "+" : ""}${data.kpis.growthRate}%`}
                subtitle="Period comparison"
                color={data.kpis.growthRate >= 0 ? "bg-emerald-500" : "bg-red-500"}
                delay={0.25}
              />
              <KPICard
                icon={Layers} title="Projects"
                value={animProjects}
                subtitle="Active services"
                color="bg-amber-500" delay={0.3}
              />
            </div>

            {/* ── Charts Grid ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-8">

              {/* 1. Combo Chart — Revenue Trend */}
              {comboChartData && (
                <ChartCard title="Revenue Trend" subtitle="Monthly revenue with moving average trend line" fullWidth delay={0.1}>
                  <Bar
                    data={comboChartData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 12, padding: 15, font: { size: 11 } } },
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatFull(ctx.raw)}` },
                        },
                      },
                      scales: {
                        y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 2. Donut — Client Share */}
              {donutData && (
                <ChartCard title="Client Revenue Share" subtitle="Revenue distribution across all clients" delay={0.15}>
                  <Doughnut
                    data={donutData}
                    options={{
                      ...chartDefaults,
                      cutout: "62%",
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "right", labels: { boxWidth: 10, padding: 8, font: { size: 10 }, generateLabels: (chart) => {
                          const dataset = chart.data.datasets[0];
                          return chart.data.labels.map((label, i) => ({
                            text: label.length > 15 ? label.slice(0, 13) + "…" : label,
                            fillStyle: dataset.backgroundColor[i],
                            strokeStyle: "#fff",
                            lineWidth: 1,
                            index: i,
                          }));
                        }}},
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: { label: (ctx) => `${ctx.label}: ${formatFull(ctx.raw)}` },
                        },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 3. Stacked Bar — Client per Month */}
              {stackedBarData && (
                <ChartCard title="Client Revenue by Month" subtitle="Stacked contribution of top clients per month" delay={0.2}>
                  <Bar
                    data={stackedBarData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatFull(ctx.raw)}` } },
                      },
                      scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                        y: { stacked: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 4. Horizontal Bar — Top Projects */}
              {horizontalBarData && (
                <ChartCard title="Top Projects by Revenue" subtitle="Best-performing services and work programs" delay={0.25}>
                  <Bar
                    data={horizontalBarData}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y",
                      plugins: {
                        ...chartDefaults.plugins,
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => formatFull(ctx.raw) } },
                      },
                      scales: {
                        x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 5. Area — Cumulative Revenue */}
              {areaChartData && (
                <ChartCard title="Cumulative Revenue Growth" subtitle="Total revenue accumulation over time — tracks acceleration" delay={0.3}>
                  <Line
                    data={areaChartData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => `Total: ${formatFull(ctx.raw)}` } },
                      },
                      scales: {
                        y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 6. Waterfall — Monthly Changes */}
              {waterfallData && (
                <ChartCard title="Revenue Waterfall" subtitle="Month-over-month revenue increase/decrease" delay={0.35}>
                  <Bar
                    data={waterfallData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: {
                            label: (ctx) => {
                              const v = ctx.raw;
                              return `${v >= 0 ? "+" : ""}${formatFull(v)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          grid: { color: "rgba(0,0,0,0.04)" },
                          ticks: { callback: (v) => `${v >= 0 ? "+" : ""}${formatCurrency(v)}`, font: { size: 10 } },
                        },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 7. Funnel — Invoice Value Ranges */}
              {funnelData && (
                <ChartCard title="Invoice Value Funnel" subtitle="Distribution of invoices by value range" delay={0.4}>
                  <Bar
                    data={funnelData}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y",
                      plugins: {
                        ...chartDefaults.plugins,
                        datalabels: {
                          display: true,
                          color: "#fff",
                          font: { weight: "bold", size: 12 },
                          anchor: "center",
                        },
                      },
                      scales: {
                        x: { display: false },
                        y: { grid: { display: false }, ticks: { font: { size: 11, weight: "600" } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 8. Radar — Client Comparison */}
              {radarData && (
                <ChartCard title="Client Profile Comparison" subtitle="Multi-metric radar analysis of top clients" delay={0.45}>
                  <Radar
                    data={radarData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                          ticks: { display: false, stepSize: 25 },
                          grid: { color: "rgba(0,0,0,0.06)" },
                          angleLines: { color: "rgba(0,0,0,0.06)" },
                          pointLabels: { font: { size: 10, weight: "600" } },
                        },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 9. Scatter — Quantity vs Rate */}
              {scatterData && (
                <ChartCard title="Pricing Analysis" subtitle="Quantity vs Rate per item — find pricing sweet spots" delay={0.5}>
                  <Scatter
                    data={scatterData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: { label: (ctx) => `Qty: ${ctx.raw.x}, Rate: ${formatFull(ctx.raw.y)}` },
                        },
                      },
                      scales: {
                        x: { title: { display: true, text: "Quantity", font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.04)" } },
                        y: { title: { display: true, text: "Rate (₹)", font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v) } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 10. Gauge — Revenue Target */}
              <ChartCard title="Revenue Target Achievement" subtitle="Based on projected annual target from peak monthly revenue" delay={0.52}>
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                      {/* Background arc */}
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 80 * 0.75} ${Math.PI * 80 * 0.25}`}
                        strokeDashoffset={-Math.PI * 80 * 0.125}
                      />
                      {/* Value arc */}
                      <circle cx="100" cy="100" r="80" fill="none"
                        stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 80 * 0.75 * (gaugePercent / 100)} ${Math.PI * 80 - Math.PI * 80 * 0.75 * (gaugePercent / 100)}`}
                        strokeDashoffset={-Math.PI * 80 * 0.125}
                        style={{ transition: "stroke-dasharray 1.5s ease" }}
                      />
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{gaugePercent}%</span>
                      <span className="text-xs text-slate-400 font-medium mt-0.5">of target</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    {formatFull(data.kpis.totalRevenue)} earned
                  </p>
                </div>
              </ChartCard>

              {/* 11. Pareto — Top Items 80/20 */}
              {paretoData && (
                <ChartCard title="Pareto Analysis (80/20 Rule)" subtitle="Top items contribution to total revenue with cumulative %" fullWidth delay={0.55}>
                  <Bar
                    data={paretoData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 12, font: { size: 10 } } },
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: {
                            label: (ctx) => {
                              if (ctx.dataset.type === "line") return `Cumulative: ${ctx.raw}%`;
                              return `Revenue: ${formatFull(ctx.raw)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: { position: "left", grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                        y1: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { callback: (v) => `${v}%`, font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 12. Pie — Tax Breakdown */}
              {pieData && (
                <ChartCard title="Tax Structure Overview" subtitle="Taxable amount distribution by tax rate" delay={0.6}>
                  <Pie
                    data={pieData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "right", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: { label: (ctx) => `${ctx.label}: ${formatFull(ctx.raw)}` },
                        },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 13. Stacked Area — Work Program Timeline */}
              {stackedAreaData && (
                <ChartCard title="Work Program Progress" subtitle="Revenue by work program/service over time" delay={0.65}>
                  <Line
                    data={stackedAreaData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 8, font: { size: 9 } } },
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatFull(ctx.raw)}` } },
                      },
                      scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                        y: { stacked: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 14. Bubble — Client Value Mapping */}
              {bubbleData && (
                <ChartCard title="Client Value Mapping" subtitle="Bubble size = revenue, X = invoices, Y = avg value" delay={0.7}>
                  <Bubble
                    data={bubbleData}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 8, font: { size: 10 } } },
                        tooltip: {
                          ...chartDefaults.plugins.tooltip,
                          callbacks: {
                            label: (ctx) => {
                              const d = ctx.raw;
                              return `Invoices: ${d.x}, Avg: ${formatFull(d.y)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: { title: { display: true, text: "Invoice Count", font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.04)" } },
                        y: { title: { display: true, text: "Avg Invoice Value", font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v) } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 15. Lollipop — Material Requisition */}
              {lollipopData && (
                <ChartCard title="Material Requisition Quantities" subtitle="Total quantities ordered per material/service type" delay={0.75}>
                  <Bar
                    data={lollipopData}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y",
                      plugins: {
                        ...chartDefaults.plugins,
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => `Qty: ${ctx.raw}` } },
                      },
                      scales: {
                        x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 } } },
                        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}

              {/* 16. Bullet — Revenue vs Benchmark */}
              {bulletData && (
                <ChartCard title="Client Revenue vs Benchmark" subtitle="Revenue performance against portfolio average" delay={0.8}>
                  <Bar
                    data={bulletData}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y",
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: true, position: "top", labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatFull(ctx.raw)}` } },
                      },
                      scales: {
                        x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </ChartCard>
              )}
            </div>

            {/* ── Payment Flow (Sankey-like Table) ─────────────────────── */}
            {flowData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="glass-card p-5 sm:p-6 mb-8"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="p-2 rounded-xl bg-purple-50">
                      <GitBranch size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">Payment Flow Analysis</h3>
                      <p className="text-[11px] text-slate-400">Client → Project revenue flow (Sankey-style)</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client (Source)</th>
                        <th>Project (Destination)</th>
                        <th>Revenue</th>
                        <th>Flow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowData.slice(0, 15).map((flow, i) => {
                        const maxFlow = flowData[0]?.value || 1;
                        const width = Math.max(8, (flow.value / maxFlow) * 100);
                        return (
                          <tr key={i}>
                            <td className="font-medium text-slate-700">{flow.from}</td>
                            <td className="text-slate-600">{flow.to}</td>
                            <td className="font-semibold text-indigo-600">{formatFull(flow.value)}</td>
                            <td>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${width}%`,
                                    background: `linear-gradient(90deg, ${COLORS.vivid[i % COLORS.vivid.length]}, ${COLORS.vivid[(i + 1) % COLORS.vivid.length]})`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Calendar Heatmap ─────────────────────────────────────── */}
            {calendarData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="glass-card p-5 sm:p-6 mb-8"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="p-2 rounded-xl bg-green-50">
                      <Calendar size={18} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">Invoice Activity Calendar</h3>
                      <p className="text-[11px] text-slate-400">Daily invoice activity — darker = higher revenue</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {calendarData.map((day, i) => {
                    const maxRev = Math.max(...calendarData.map((d) => d.revenue)) || 1;
                    const intensity = Math.max(0.1, day.revenue / maxRev);
                    return (
                      <div
                        key={i}
                        title={`${day.date}: ${day.count} invoice(s), ${formatFull(day.revenue)}`}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm cursor-pointer transition-transform hover:scale-150"
                        style={{
                          backgroundColor: `rgba(99, 102, 241, ${intensity})`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-slate-400">Less</span>
                  {[0.1, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(99,102,241,${v})` }} />
                  ))}
                  <span className="text-[10px] text-slate-400">More</span>
                </div>
              </motion.div>
            )}

            {/* ── Material Requisition Deep Dive ──────────────────────── */}
            {data.materialCategories?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 }}
                className="glass-card p-5 sm:p-6 mb-8"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="p-2 rounded-xl bg-amber-50">
                      <Package size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">Material Requisition Analysis</h3>
                      <p className="text-[11px] text-slate-400">Detailed breakdown of materials, quantities, and values</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Material / Service</th>
                        <th>Total Qty</th>
                        <th>Total Value</th>
                        <th>Invoices</th>
                        <th>Avg Value/Invoice</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.materialCategories.slice(0, 15).map((mat, i) => {
                        const share = data.kpis.totalRevenue > 0
                          ? Math.round((mat.totalValue / data.kpis.totalRevenue) * 1000) / 10
                          : 0;
                        return (
                          <tr key={i}>
                            <td className="text-slate-400 font-mono text-xs">{i + 1}</td>
                            <td className="font-medium text-slate-700">{mat.name}</td>
                            <td className="font-mono">{mat.totalQty}</td>
                            <td className="font-semibold text-indigo-600">{formatFull(mat.totalValue)}</td>
                            <td>{mat.invoiceCount}</td>
                            <td className="text-slate-600">{formatFull(mat.totalValue / mat.invoiceCount)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden max-w-[80px]">
                                  <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${share}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Business Insights ───────────────────────────────────── */}
            {insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="glass-card p-5 sm:p-6 mb-8"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-300/30">
                    <Zap size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">Business Insights & Recommendations</h3>
                    <p className="text-[11px] text-slate-400">AI-powered insights to grow your business</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + i * 0.08 }}
                      className={`flex items-start gap-3 p-4 rounded-xl border ${
                        insight.type === "warning"
                          ? "bg-amber-50/60 border-amber-200"
                          : insight.type === "success"
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-blue-50/60 border-blue-200"
                      }`}
                    >
                      <insight.icon
                        size={18}
                        className={`shrink-0 mt-0.5 ${
                          insight.type === "warning" ? "text-amber-500"
                          : insight.type === "success" ? "text-emerald-500"
                          : "text-blue-500"
                        }`}
                      />
                      <p className="text-sm text-slate-700 leading-relaxed">{insight.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Profitability Table ─────────────────────────────────── */}
            {data.profitabilityByClient?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="glass-card p-5 sm:p-6"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="p-2 rounded-xl bg-indigo-50">
                      <Activity size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">Client Profitability Analysis</h3>
                      <p className="text-[11px] text-slate-400">Comprehensive client-wise performance metrics</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Revenue</th>
                        <th>Invoices</th>
                        <th>Avg Items</th>
                        <th>Revenue Share</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.profitabilityByClient.map((client, i) => (
                        <tr key={i}>
                          <td className="font-medium text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.vivid[i % COLORS.vivid.length] }} />
                              {client.name}
                            </div>
                          </td>
                          <td className="font-semibold text-indigo-600">{formatFull(client.revenue)}</td>
                          <td>{client.invoiceCount}</td>
                          <td>{client.avgItemsPerInvoice}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${client.revenueShare}%`,
                                    backgroundColor: COLORS.vivid[i % COLORS.vivid.length],
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-500">{client.revenueShare}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              client.revenueShare > 20
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : client.revenueShare > 5
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}>
                              {client.revenueShare > 20 ? (
                                <><ArrowUpRight size={12} /> Key</>
                              ) : client.revenueShare > 5 ? (
                                <><Activity size={12} /> Active</>
                              ) : (
                                <><Target size={12} /> Growth</>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── No Data State ───────────────────────────────────────── */}
            {data.kpis?.invoiceCount === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-12 text-center"
              >
                <BarChart3 size={56} className="text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700 mb-2">No Data Available</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  There are no invoices matching your current filters. Create some invoices first or adjust your filters to see analytics.
                </p>
                <button onClick={resetFilters} className="btn-primary text-sm px-6 py-2.5">
                  <RefreshCw size={14} /> Reset Filters
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
