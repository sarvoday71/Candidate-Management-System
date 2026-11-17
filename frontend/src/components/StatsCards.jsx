import { Briefcase, Clock, Trophy, Users } from 'lucide-react'

function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  )
}

export default function StatsCards({ candidates, loading }) {
  const total = candidates.length
  const inPipeline = candidates.filter((c) => !['HIRED', 'REJECTED'].includes(c.status)).length
  const hired = candidates.filter((c) => c.status === 'HIRED').length
  const avgExp = total ? (candidates.reduce((sum, c) => sum + (c.experienceYears || 0), 0) / total).toFixed(1) : '0'
  const show = (v) => (loading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-100 align-middle" /> : v)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard icon={Users} label="Total candidates" value={show(total)} hint="Across all stages" tone="bg-indigo-50 text-indigo-600" />
      <StatCard icon={Clock} label="In pipeline" value={show(inPipeline)} hint="Still being evaluated" tone="bg-violet-50 text-violet-600" />
      <StatCard icon={Trophy} label="Hired" value={show(hired)} hint="Successfully placed" tone="bg-emerald-50 text-emerald-600" />
      <StatCard icon={Briefcase} label="Avg. experience" value={show(`${avgExp} yrs`)} hint="Per candidate" tone="bg-amber-50 text-amber-600" />
    </div>
  )
}
