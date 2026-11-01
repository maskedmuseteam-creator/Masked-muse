import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart3, Filter, Zap, ArrowUpRight } from 'lucide-react';

interface TrendAnalyticsChartProps {
  onTagSelect?: (tag: string | null) => void;
  selectedTag?: string | null;
}

// 7-day trend data for PulseX hashtags
const SEVEN_DAY_DATA = [
  { day: 'Oct 20', PulseX: 420, Architecture: 310, Engineering: 240, Minimalism: 180, Dev: 150 },
  { day: 'Oct 21', PulseX: 580, Architecture: 390, Engineering: 290, Minimalism: 210, Dev: 190 },
  { day: 'Oct 22', PulseX: 740, Architecture: 480, Engineering: 350, Minimalism: 270, Dev: 220 },
  { day: 'Oct 23', PulseX: 920, Architecture: 610, Engineering: 430, Minimalism: 320, Dev: 260 },
  { day: 'Oct 24', PulseX: 1110, Architecture: 710, Engineering: 500, Minimalism: 370, Dev: 310 },
  { day: 'Oct 25', PulseX: 1290, Architecture: 800, Engineering: 560, Minimalism: 410, Dev: 350 },
  { day: 'Oct 26', PulseX: 1450, Architecture: 890, Engineering: 620, Minimalism: 450, Dev: 380 },
];

const TAG_CONFIG = [
  { key: 'PulseX', label: '#PulseX', color: '#3B82F6', growth: '+245%', volume: '1.45K' },
  { key: 'Architecture', label: '#Architecture', color: '#06B6D4', growth: '+187%', volume: '890' },
  { key: 'Engineering', label: '#Engineering', color: '#10B981', growth: '+158%', volume: '620' },
  { key: 'Minimalism', label: '#Minimalism', color: '#F59E0B', growth: '+150%', volume: '450' },
  { key: 'Dev', label: '#Dev', color: '#A855F7', growth: '+153%', volume: '380' },
];

export const TrendAnalyticsChart: React.FC<TrendAnalyticsChartProps> = ({
  onTagSelect,
  selectedTag,
}) => {
  const [activeFocusTag, setActiveFocusTag] = useState<string | 'ALL'>('ALL');
  const [chartType, setChartType] = useState<'area' | 'stacked'>('area');

  const currentConfig = TAG_CONFIG.find((t) => t.key.toLowerCase() === activeFocusTag.toLowerCase());

  // Custom tooltip with sleek dark styling and tabular numerals
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs min-w-[160px]">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 border-b border-slate-800/80 pb-1">
            {label} · Mentions
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-300 truncate font-medium">#{entry.name}</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleTagToggle = (tagKey: string) => {
    if (activeFocusTag === tagKey) {
      setActiveFocusTag('ALL');
    } else {
      setActiveFocusTag(tagKey);
    }
    if (onTagSelect) {
      onTagSelect(tagKey);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">7-Day Trend Velocity</h2>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hashtag mention trajectory across community posts from Oct 20 to Oct 26.
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveFocusTag('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeFocusTag === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Hashtags
          </button>
          <button
            onClick={() => setChartType(chartType === 'area' ? 'stacked' : 'area')}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Toggle chart visual style"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 block mb-0.5">Top Trending #</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 font-mono">#PulseX</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +245%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tabular-nums">1,450 mentions</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 block mb-0.5">Design Leader</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 font-mono">#Architecture</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +187%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tabular-nums">890 mentions</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 block mb-0.5">Engineering</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 font-mono">#Engineering</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +158%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tabular-nums">620 mentions</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 block mb-0.5">Total 7-Day Reach</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono tabular-nums">3,790</span>
            <span className="text-[10px] text-purple-400 font-mono">+178% avg</span>
          </div>
          <span className="text-[10px] text-slate-500">Across 5 primary topics</span>
        </div>
      </div>

      {/* Hashtag Filter Badges / Selector Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter chart:
        </span>
        {TAG_CONFIG.map((tag) => {
          const isActive = activeFocusTag === tag.key;
          return (
            <button
              key={tag.key}
              onClick={() => handleTagToggle(tag.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
              <span>{tag.label}</span>
              <span className="text-[10px] text-slate-500">{tag.growth}</span>
            </button>
          );
        })}
        {activeFocusTag !== 'ALL' && (
          <button
            onClick={() => {
              setActiveFocusTag('ALL');
              if (onTagSelect) onTagSelect(null);
            }}
            className="text-[11px] text-blue-400 hover:underline ml-1"
          >
            Show All
          </button>
        )}
      </div>

      {/* Recharts Analytics Visualization */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={SEVEN_DAY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {TAG_CONFIG.map((tag) => (
                <linearGradient key={tag.key} id={`grad_${tag.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tag.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tag.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="day"
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />

            <YAxis
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              domain={[0, 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* If a specific tag is focused, render only that tag with highlighted area */}
            {activeFocusTag !== 'ALL' && currentConfig ? (
              <Area
                type="monotone"
                dataKey={currentConfig.key}
                name={currentConfig.key}
                stroke={currentConfig.color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#grad_${currentConfig.key})`}
              />
            ) : (
              TAG_CONFIG.map((tag) => (
                <Area
                  key={tag.key}
                  type="monotone"
                  dataKey={tag.key}
                  name={tag.key}
                  stroke={tag.color}
                  strokeWidth={2}
                  fillOpacity={chartType === 'stacked' ? 0.6 : 0.2}
                  stackId={chartType === 'stacked' ? '1' : undefined}
                  fill={`url(#grad_${tag.key})`}
                />
              ))
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Click on any hashtag badge above to isolate trajectory and filter feed.</span>
        <span className="font-mono">Updated hourly</span>
      </div>
    </div>
  );
};
