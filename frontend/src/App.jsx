import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts'

/* ─── Design tokens ─────────────────────────────────────────────────── */
const S = {
  bg:      '#0f1117',
  surface: '#181d27',
  card:    '#1e2535',
  border:  '#2a3348',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  text:    '#f0f4ff',
  muted:   '#8892aa',
}

const COMMODITIES = ['Onion','Tomato','Potato','Wheat','Rice','Maize']
const MARKETS     = ['Pune','Nashik','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Bhopal']

const SIGNAL_COLOR = { BUY: S.green, SELL: S.red, HOLD: S.amber }
const SIGNAL_BG    = { BUY: '#052e16', SELL: '#1f0404', HOLD: '#1c1000' }

/* ─── Helpers ────────────────────────────────────────────────────────── */
const fmt = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const api = async (path) => {
  const r = await fetch(`/api${path}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:S.muted }}>
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: S.card, color: S.text, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor:'pointer',
        }}
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding: 60, color: S.muted, flexDirection:'column', gap:12 }}>
      <div style={{
        width:32, height:32, border:`3px solid ${S.border}`,
        borderTopColor: S.blue, borderRadius:'50%',
        animation:'spin 0.8s linear infinite',
      }}/>
      <span style={{fontSize:13}}>Training models & generating forecast…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SignalBadge({ signal }) {
  if (!signal) return null
  return (
    <span style={{
      background: SIGNAL_BG[signal],
      color: SIGNAL_COLOR[signal],
      border: `1px solid ${SIGNAL_COLOR[signal]}44`,
      borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>{signal}</span>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:'12px 16px' }}>
      <div style={{ fontSize:11, color:S.muted, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:600, color:S.text }}>{value}</div>
    </div>
  )
}

/* ─── Forecast Tab ───────────────────────────────────────────────────── */
function ForecastTab() {
  const [commodity, setCommodity] = useState('Onion')
  const [market,    setMarket]    = useState('Pune')
  const [horizon,   setHorizon]   = useState(14)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await api(`/predict/forecast?commodity=${commodity}&market=${market}&horizon=${horizon}`)
      setData(d)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [commodity, market, horizon])

  const chartData = data ? data.dates.map((date, i) => ({
    date: date.slice(5),
    ensemble: data.ensemble[i],
    arima:    data.arima[i],
    xgb:      data.xgb[i],
    ci_lower: data.ci_lower[i],
    ci_upper: data.ci_upper[i],
  })) : []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Controls */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <Select label="Commodity" value={commodity} onChange={setCommodity} options={COMMODITIES} />
        <Select label="Market"    value={market}    onChange={setMarket}    options={MARKETS} />
        <label style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:S.muted }}>
          Horizon (days)
          <input
            type="number" min={1} max={60} value={horizon}
            onChange={e => setHorizon(Number(e.target.value))}
            style={{
              background:S.card, color:S.text, border:`1px solid ${S.border}`,
              borderRadius:8, padding:'6px 10px', fontSize:13, width:100,
            }}
          />
        </label>
        <button onClick={run} style={{
          background: S.blue, color:'#fff', border:'none', borderRadius:8,
          padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
        }}>
          Run Forecast
        </button>
      </div>

      {error && <div style={{ color:S.red, fontSize:13 }}>Error: {error}</div>}
      {loading && <Spinner />}

      {data && !loading && (
        <>
          {/* Signal banner */}
          <div style={{
            background: SIGNAL_BG[data.signal],
            border: `1px solid ${SIGNAL_COLOR[data.signal]}44`,
            borderRadius:10, padding:'14px 20px',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <SignalBadge signal={data.signal} />
            <span style={{ color: S.text, fontSize:14 }}>{data.signal_reason}</span>
            <span style={{ marginLeft:'auto', color:S.muted, fontSize:12 }}>
              Current: <strong style={{color:S.text}}>{fmt(data.current_price)}/q</strong>
            </span>
          </div>

          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            <StatCard label="Current price" value={fmt(data.current_price)} />
            <StatCard label="Forecast end"  value={fmt(data.ensemble[data.ensemble.length-1])} />
            <StatCard label="Trend"         value={`${data.trend_pct > 0 ? '+' : ''}${data.trend_pct}%`} />
            <StatCard label="Horizon"       value={`${data.horizon_days} days`} />
          </div>

          {/* Chart */}
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'20px 16px' }}>
            <div style={{ fontSize:13, color:S.muted, marginBottom:12 }}>Price forecast with confidence interval</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={S.blue} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={S.blue} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                <XAxis dataKey="date" tick={{fill:S.muted,fontSize:11}} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} tick={{fill:S.muted,fontSize:11}} />
                <Tooltip
                  contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}}
                  labelStyle={{color:S.muted}}
                  formatter={(v,n) => [fmt(v), n]}
                />
                <Legend wrapperStyle={{fontSize:12,color:S.muted}} />
                <Area dataKey="ci_upper" stroke="none" fill="url(#ciGrad)" name="CI upper" legendType="none"/>
                <Area dataKey="ci_lower" stroke="none" fill={S.bg} name="CI lower" legendType="none"/>
                <Line dataKey="ensemble" stroke={S.blue}   dot={false} strokeWidth={2.5} name="Ensemble"/>
                <Line dataKey="arima"    stroke={S.purple} dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="ARIMA"/>
                <Line dataKey="xgb"      stroke={S.green}  dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="XGBoost"/>

              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Day-by-day table */}
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', fontSize:13, color:S.muted, borderBottom:`1px solid ${S.border}` }}>Day-by-day forecast</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:S.surface }}>
                    {['Date','Ensemble','ARIMA','XGBoost','CI Low','CI High'].map(h => (
                      <th key={h} style={{ padding:'8px 14px', color:S.muted, fontWeight:500, textAlign:'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${S.border}` }}>
                      <td style={{ padding:'7px 14px', color:S.muted }}>{data.dates[i]}</td>
                      <td style={{ padding:'7px 14px', color:S.blue,   fontWeight:600 }}>{fmt(row.ensemble)}</td>
                      <td style={{ padding:'7px 14px', color:S.purple }}>{fmt(row.arima)}</td>
                      <td style={{ padding:'7px 14px', color:S.green  }}>{fmt(row.xgb)}</td>
                      <td style={{ padding:'7px 14px', color:S.muted  }}>{fmt(row.ci_lower)}</td>
                      <td style={{ padding:'7px 14px', color:S.muted  }}>{fmt(row.ci_upper)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Historical Tab ─────────────────────────────────────────────────── */
function HistoricalTab() {
  const [commodity, setCommodity] = useState('Onion')
  const [market,    setMarket]    = useState('Pune')
  const [days,      setDays]      = useState(180)
  const [prices,    setPrices]    = useState(null)
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        api(`/historical/prices?commodity=${commodity}&market=${market}&days=${days}`),
        api(`/historical/stats?commodity=${commodity}&market=${market}`),
      ])
      setPrices(p); setStats(s)
    } finally { setLoading(false) }
  }, [commodity, market, days])

  const lineData = prices ? prices.dates.map((d, i) => ({
    date: d.slice(5), price: prices.prices[i],
  })) : []

  const barData = stats ? Object.entries(stats.monthly_avg).map(([month, avg]) => ({
    month, avg,
  })) : []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <Select label="Commodity" value={commodity} onChange={setCommodity} options={COMMODITIES} />
        <Select label="Market"    value={market}    onChange={setMarket}    options={MARKETS} />
        <Select label="Period" value={`${days} days`} onChange={v => setDays(Number(v.split(' ')[0]))}
          options={['90 days','180 days','365 days','730 days']} />
        <button onClick={load} style={{
          background:S.blue, color:'#fff', border:'none', borderRadius:8,
          padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
        }}>Load</button>
      </div>

      {loading && <Spinner />}

      {stats && !loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
          <StatCard label="Min price"  value={fmt(stats.min)} />
          <StatCard label="Max price"  value={fmt(stats.max)} />
          <StatCard label="Mean price" value={fmt(stats.mean)} />
          <StatCard label="Std dev"    value={fmt(stats.std)} />
          <StatCard label="Latest"     value={fmt(stats.latest)} />
        </div>
      )}

      {prices && !loading && (
        <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'20px 16px' }}>
          <div style={{ fontSize:13, color:S.muted, marginBottom:12 }}>Price history</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={lineData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={S.blue} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={S.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="date" tick={{fill:S.muted,fontSize:10}} interval={Math.floor(lineData.length/6)} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} tick={{fill:S.muted,fontSize:11}} />
              <Tooltip
                contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}}
                formatter={(v) => [fmt(v),'Price']}
              />
              <Area dataKey="price" stroke={S.blue} fill="url(#priceGrad)" dot={false} strokeWidth={1.5} name="Price"/>
              <Brush dataKey="date" height={20} stroke={S.border} fill={S.surface} travellerWidth={6}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats && !loading && barData.length > 0 && (
        <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'20px 16px' }}>
          <div style={{ fontSize:13, color:S.muted, marginBottom:12 }}>Monthly average (last 12 months)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="month" tick={{fill:S.muted,fontSize:10}} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} tick={{fill:S.muted,fontSize:11}} />
              <Tooltip
                contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}}
                formatter={(v) => [fmt(v),'Avg price']}
              />
              <Bar dataKey="avg" fill={S.purple} radius={[4,4,0,0]} name="Avg price"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ─── Compare Tab ────────────────────────────────────────────────────── */
function CompareTab() {
  const [market,  setMarket]  = useState('Pune')
  const [horizon, setHorizon] = useState(14)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api(`/predict/compare?market=${market}&horizon=${horizon}`)
      setData(d)
    } finally { setLoading(false) }
  }, [market, horizon])

  const barData = data ? data.commodities.map(c => ({
    name: c.commodity,
    trend: c.trend_pct,
  })) : []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <Select label="Market"  value={market}  onChange={setMarket}  options={MARKETS} />
        <Select label="Horizon" value={`${horizon} days`}
          onChange={v => setHorizon(Number(v.split(' ')[0]))}
          options={['7 days','14 days','30 days','60 days']} />
        <button onClick={run} style={{
          background:S.blue, color:'#fff', border:'none', borderRadius:8,
          padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
        }}>Compare All</button>
      </div>

      {loading && <Spinner />}

      {data && !loading && (
        <>
          {/* Signal grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {data.commodities.map(c => (
              <div key={c.commodity} style={{
                background:S.card, border:`1px solid ${S.border}`,
                borderRadius:12, padding:'16px',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontWeight:600, color:S.text }}>{c.commodity}</span>
                  <SignalBadge signal={c.signal} />
                </div>
                <div style={{ fontSize:12, color:S.muted, marginBottom:4 }}>{c.signal_reason}</div>
                <div style={{ display:'flex', gap:16, marginTop:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:S.muted }}>Current</div>
                    <div style={{ fontSize:14, color:S.text, fontWeight:500 }}>{fmt(c.current_price)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:S.muted }}>Forecast</div>
                    <div style={{ fontSize:14, color:S.text, fontWeight:500 }}>{fmt(c.forecast_end)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:S.muted }}>Trend</div>
                    <div style={{
                      fontSize:14, fontWeight:600,
                      color: c.trend_pct > 0 ? S.red : c.trend_pct < 0 ? S.green : S.amber,
                    }}>
                      {c.trend_pct > 0 ? '+' : ''}{c.trend_pct}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend bar chart */}
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:12, padding:'20px 16px' }}>
            <div style={{ fontSize:13, color:S.muted, marginBottom:12 }}>Trend comparison (% change over {data.horizon_days} days)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={S.border} horizontal={false}/>
                <XAxis type="number" tickFormatter={v => `${v}%`} tick={{fill:S.muted,fontSize:11}}/>
                <YAxis type="category" dataKey="name" tick={{fill:S.text,fontSize:12}} width={60}/>
                <Tooltip
                  contentStyle={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}}
                  formatter={v => [`${v}%`,'Trend']}
                />
                <ReferenceLine x={0} stroke={S.border} strokeWidth={1.5}/>
                <Bar dataKey="trend" radius={[0,4,4,0]}
                  fill={S.blue}
                  label={{ position:'right', fill:S.muted, fontSize:11, formatter: v => `${v > 0 ? '+' : ''}${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── App Shell ──────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState('forecast')

  const tabs = [
    { id:'forecast',   label:'Forecast' },
    { id:'historical', label:'Historical' },
    { id:'compare',    label:'Compare' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:S.bg, color:S.text, fontFamily:"'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background:S.surface, borderBottom:`1px solid ${S.border}`, padding:'0 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', gap:16, height:56 }}>
          <span style={{ fontSize:22 }}>🌾</span>
          <div>
            <div style={{ fontWeight:600, fontSize:16, lineHeight:1 }}>AgriPrice Predictor</div>
            <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>AI/ML price forecasting · HackBlitz S3</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? S.blue+'22' : 'transparent',
                color:      tab === t.id ? S.blue : S.muted,
                border:     tab === t.id ? `1px solid ${S.blue}44` : '1px solid transparent',
                borderRadius:8, padding:'6px 16px', fontSize:13, cursor:'pointer',
                fontFamily:"'DM Sans',sans-serif", fontWeight: tab === t.id ? 600 : 400,
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px' }}>
        {tab === 'forecast'   && <ForecastTab />}
        {tab === 'historical' && <HistoricalTab />}
        {tab === 'compare'    && <CompareTab />}
      </div>
    </div>
  )
}
