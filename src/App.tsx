import React, { useMemo, useState } from 'react'
import { Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// --- Pure helpers ---
const rangeMid = (range: string) => {
  switch (range) {
    case 'dp_small': return 50
    case 'dp_medium': return 300
    case 'dp_large': return 1250
    case 'dp_vlarge': return 2500
    case 'bi_small': return 250
    case 'bi_medium': return 1250
    case 'bi_large': return 6000
    case 'bi_vlarge': return 15000
    default: return 0
  }
}

const assetFactor = (bucket: string) => {
  switch (bucket) {
    case 'assets_small': return 1.0
    case 'assets_medium': return 1.2
    case 'assets_large': return 1.5
    case 'assets_vlarge': return 2.0
    default: return 1.0
  }
}

const complianceFactor = (level: string) => {
  switch (level) {
    case 'low': return 1.0
    case 'medium': return 1.5
    case 'high': return 2.0
    default: return 1.0
  }
}

const governanceFactor = (model: string) => {
  switch (model) {
    case 'centralized': return 1.5
    case 'mixed': return 1.0
    case 'selfservice': return 0.75
    default: return 1.0
  }
}

function TicketCalculator() {
  // Inputs
  const [dpRange, setDpRange] = useState('dp_medium')
  const [biRange, setBiRange] = useState('bi_large')
  const [assetRange, setAssetRange] = useState('assets_large')
  const [compliance, setCompliance] = useState('high')
  const [governance, setGovernance] = useState('mixed')
  const [dpReq, setDpReq] = useState(5)
  const [biReq, setBiReq] = useState(1.5)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCycle, setShowCycle] = useState(false)

  // Cycle-time (calendar days) assumptions
  const [mgrDays, setMgrDays] = useState(1)
  const [govDays, setGovDays] = useState(3)
  const [secLegalDays, setSecLegalDays] = useState(4)
  const [secLegalPct, setSecLegalPct] = useState(30)
  const [itDays, setItDays] = useState(5)

  const numbers = useMemo(() => {
    const dpUsers = rangeMid(dpRange)
    const biUsers = rangeMid(biRange)

    const base = dpUsers * dpReq + biUsers * biReq
    const factor = assetFactor(assetRange) * complianceFactor(compliance) * governanceFactor(governance)

    // Tickets: original adjustment plus compounded reductions (50%, 20%, 30%)
    const adjustment = 0.75
    const ticketReduction = 0.5 * 0.8 * 0.7 // = 0.28 overall

    const annual = Math.round(base * factor * adjustment * ticketReduction)
    const monthly = Math.round(annual / 12)

    const selfServiceAnnual = Math.round(
      base * assetFactor(assetRange) * complianceFactor(compliance) * governanceFactor('selfservice') * adjustment * ticketReduction
    )
    const centralizedAnnual = Math.round(
      base * assetFactor(assetRange) * complianceFactor(compliance) * governanceFactor('centralized') * adjustment * ticketReduction
    )

    // Effort model (hours): 50% base reduction, then extra 40% to both current & future
    const effortReduction = 0.5

    const coordHours = 1.0 * effortReduction
    const itHours = 6.0 * effortReduction
    const mgrPct = 30
    const mgrHours = 0.5 * effortReduction
    const govPct = 20
    const govHours = 1.0 * effortReduction

    const postCoordHours = 0.25 * effortReduction
    const postItHours = 0
    const postMgrPct = 10
    const postMgrHours = 0.1 * effortReduction
    const postGovPct = 10
    const postGovHours = 0.25 * effortReduction

    const blendedRate = 70

    const requestsPerYear = annual

    const mgrExpected = (mgrPct / 100) * mgrHours
    const govExpected = (govPct / 100) * govHours

    const postMgrExpected = (postMgrPct / 100) * postMgrHours
    const postGovExpected = (postGovPct / 100) * postGovHours

    const currentHoursPerReqBase = coordHours + itHours + mgrExpected + govExpected
    const futureHoursPerReqBase = postCoordHours + postItHours + postMgrExpected + postGovExpected

    const hoursAdjustmentExtra = 0.6 // 40% lower for both current & future

    const currentHoursPerReq = currentHoursPerReqBase * hoursAdjustmentExtra
    const futureHoursPerReq = futureHoursPerReqBase * hoursAdjustmentExtra

    const currentHoursAnnual = requestsPerYear * currentHoursPerReq
    const futureHoursAnnual = requestsPerYear * futureHoursPerReq
    const hoursSaved = Math.max(0, currentHoursAnnual - futureHoursAnnual)
    const costSaved = Math.round(hoursSaved * blendedRate)

    // Serialized calendar lead time (waiting days)
    const needsSecLegal = secLegalPct / 100
    const avgApprovalDays = mgrDays + govDays + needsSecLegal * secLegalDays
    const leadTimeDaysPerReq = avgApprovalDays + itDays // sequential sum
    const leadTimeWeeksPerReq = leadTimeDaysPerReq / 5  // ~5 workdays/week
    const annualWaitingDays = requestsPerYear * leadTimeDaysPerReq
    const wipApprox = (requestsPerYear / 365) * leadTimeDaysPerReq // Little's Law approx

    return {
      dpUsers,
      biUsers,
      annual,
      monthly,
      selfServiceAnnual,
      centralizedAnnual,
      value: { currentHoursAnnual, futureHoursAnnual, hoursSaved, costSaved, currentHoursPerReq, futureHoursPerReq },
      flow: { leadTimeDaysPerReq, leadTimeWeeksPerReq, annualWaitingDays, wipApprox },
    }
  }, [dpRange, biRange, assetRange, compliance, governance, dpReq, biReq, mgrDays, govDays, secLegalDays, secLegalPct, itDays])

  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 flex items-start justify-center p-6">
      <Card className="w-full max-w-6xl shadow-xl">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <Calculator className="w-6 h-6 text-gray-200" />
          <h1 className="text-2xl font-semibold text-white">Data Access Ticket Estimator</h1>
        </div>
        <CardContent className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-6">
            {/* 1) People counts */}
            <section className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-1 text-white">1) How many people at your company work with data?</h2>
              <p className="text-sm text-gray-400 mb-4">Pick the closest option. Not sure? Choose a range and we’ll use a sensible estimate.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-200">Data Professionals</label>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <Radio name="dp" value="dp_small" checked={dpRange === 'dp_small'} onChange={setDpRange} label="Fewer than 100" hint="Analysts, engineers, data scientists" />
                    <Radio name="dp" value="dp_medium" checked={dpRange === 'dp_medium'} onChange={setDpRange} label="100 – 500" />
                    <Radio name="dp" value="dp_large" checked={dpRange === 'dp_large'} onChange={setDpRange} label="500 – 2,000" />
                    <Radio name="dp" value="dp_vlarge" checked={dpRange === 'dp_vlarge'} onChange={setDpRange} label="2,000+" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-200">Business / BI Users</label>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <Radio name="bi" value="bi_small" checked={biRange === 'bi_small'} onChange={setBiRange} label="Fewer than 500" />
                    <Radio name="bi" value="bi_medium" checked={biRange === 'bi_medium'} onChange={setBiRange} label="500 – 2,000" />
                    <Radio name="bi" value="bi_large" checked={biRange === 'bi_large'} onChange={setBiRange} label="2,000 – 10,000" />
                    <Radio name="bi" value="bi_vlarge" checked={biRange === 'bi_vlarge'} onChange={setBiRange} label="10,000+" />
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-2"><Info className="w-4 h-4"/>Data professionals are builders/analysts; BI users consume dashboards & reports.</div>
            </section>

            {/* 2) Asset count */}
            <section className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-1 text-white">2) How many unique data products or data assets?</h2>
              <p className="text-sm text-gray-400 mb-4">Think curated datasets, dashboards, marts — not raw systems.</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Chip value="assets_small" label="< 50" selected={assetRange === 'assets_small'} onSelect={setAssetRange} />
                <Chip value="assets_medium" label="50 – 500" selected={assetRange === 'assets_medium'} onSelect={setAssetRange} />
                <Chip value="assets_large" label="500 – 5,000" selected={assetRange === 'assets_large'} onSelect={setAssetRange} />
                <Chip value="assets_vlarge" label="> 5,000" selected={assetRange === 'assets_vlarge'} onSelect={setAssetRange} />
              </div>
            </section>

            {/* 3) Regulation & approval model */}
            <section className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-1 text-white">3) Industry regulation & approval model</h2>
              <div className="grid md:grid-cols-2 gap-6 mt-2">
                <div>
                  <label className="text-sm font-medium text-gray-200">Regulation level</label>
                  <div className="mt-2 grid gap-2">
                    <Radio name="comp" value="low" checked={compliance === 'low'} onChange={setCompliance} label="Low (Retail, Media, Tech)" />
                    <Radio name="comp" value="medium" checked={compliance === 'medium'} onChange={setCompliance} label="Medium (Insurance, Manufacturing)" />
                    <Radio name="comp" value="high" checked={compliance === 'high'} onChange={setCompliance} label="High (Healthcare, Pharma, Finance, Gov)" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-200">How do you approve access?</label>
                  <div className="mt-2 grid gap-2">
                    <Radio name="gov" value="centralized" checked={governance === 'centralized'} onChange={setGovernance} label="Central IT approves everything" />
                    <Radio name="gov" value="mixed" checked={governance === 'mixed'} onChange={setGovernance} label="Mixed / Hybrid" />
                    <Radio name="gov" value="selfservice" checked={governance === 'selfservice'} onChange={setGovernance} label="Mostly self-service / automated" />
                  </div>
                </div>
              </div>
            </section>

            {/* 4) Advanced assumptions */}
            <section className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">4) Advanced assumptions (optional)</h2>
                <button onClick={() => setShowAdvanced((s) => !s)} className="gap-2 text-gray-200 flex items-center text-sm">
                  {showAdvanced ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                  {showAdvanced ? 'Hide' : 'Show'}
                </button>
              </div>
              {showAdvanced && (
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-200">Avg requests per Data Professional / year</label>
                    <input type="range" min={1} max={12} step={0.5} value={dpReq} onChange={(e) => setDpReq(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{dpReq.toFixed(1)} / year</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-200">Avg requests per BI User / year</label>
                    <input type="range" min={0.5} max={6} step={0.5} value={biReq} onChange={(e) => setBiReq(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{biReq.toFixed(1)} / year</div>
                  </div>
                </div>
              )}
            </section>

            {/* 5) Cycle time assumptions (collapsible) */}
            <section className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">5) Cycle time (calendar) assumptions</h2>
                <button onClick={() => setShowCycle((s) => !s)} className="gap-2 text-gray-200 flex items-center text-sm">
                  {showCycle ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                  {showCycle ? 'Hide' : 'Show'}
                </button>
              </div>
              {showCycle and (
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-200">Manager approval (days)</label>
                    <input type="range" min={0} max={10} step={0.5} value={mgrDays} onChange={(e) => setMgrDays(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{mgrDays.toFixed(1)} days</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-200">Governance + data owner (days)</label>
                    <input type="range" min={0} max={10} step={0.5} value={govDays} onChange={(e) => setGovDays(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{govDays.toFixed(1)} days</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-200">% needing security/legal</label>
                    <input type="range" min={0} max={100} step={5} value={secLegalPct} onChange={(e) => setSecLegalPct(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{secLegalPct.toFixed(0)}%</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-200">Security/legal review (days)</label>
                    <input type="range" min={0} max={10} step={0.5} value={secLegalDays} onChange={(e) => setSecLegalDays(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{secLegalDays.toFixed(1)} days</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-200">IT implementation + validation (days)</label>
                    <input type="range" min={0} max={15} step={0.5} value={itDays} onChange={(e) => setItDays(parseFloat(e.target.value))} className="w-full" />
                    <div className="text-sm text-gray-300 mt-1">{itDays.toFixed(1)} days</div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="space-y-4">
            <div className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h3 className="text-base font-semibold mb-2 text-white">Estimated Tickets</h3>
              <div className="text-4xl font-bold text-white">{numbers.annual.toLocaleString()}</div>
              <div className="text-sm text-gray-400">per year</div>
              <div className="mt-4 text-lg font-semibold text-white">
                {numbers.monthly.toLocaleString()} <span className="text-sm font-normal text-gray-400">per month</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h4 className="text-sm font-semibold mb-2 text.white text-white">Business Value Assessment</h4>
              <div className="text-sm text-gray-300">Current effort/year: <b>{Math.round(numbers.value.currentHoursAnnual).toLocaleString()}</b> hrs</div>
              <div className="text-sm text-gray-300">With Immuta effort/year: <b>{Math.round(numbers.value.futureHoursAnnual).toLocaleString()}</b> hrs</div>
              <div className="text-sm text-gray-300">Current hours/request: <b>{numbers.value.currentHoursPerReq.toFixed(2)}</b></div>
              <div className="text-sm text-gray-300">With Immuta hours/request: <b>{numbers.value.futureHoursPerReq.toFixed(2)}</b></div>
              <div className="text-sm text-gray-300 mt-2">Freed capacity: <b>{Math.round(numbers.value.hoursSaved).toLocaleString()}</b> hrs ≈ <b>{(numbers.value.hoursSaved/2080).toFixed(2)}</b> FTE</div>
              <div className="text-lg font-semibold text.white text-white mt-2">Estimated cost savings: ${numbers.value.costSaved.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-3">Savings reflect reduced manual approvals & rework via policy automation.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h4 className="text-sm font-semibold mb-2 text-white">Scenario Comparison</h4>
              <div className="text-sm text-gray-300">Self-service / automated: <b>{numbers.selfServiceAnnual.toLocaleString()}</b> / year</div>
              <div className="text-sm text-gray-300">Central IT approves all: <b>{numbers.centralizedAnnual.toLocaleString()}</b> / year</div>
              <p className="text-xs text-gray-400 mt-2">Use this to quantify the potential reduction with policy automation.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-700">
              <h4 className="text-sm font-semibold mb-2 text-white">Cycle Time (Calendar)</h4>
              <div className="text-sm text-gray-300">Avg lead time / request: <b>{numbers.flow.leadTimeDaysPerReq.toFixed(1)}</b> days (~<b>{numbers.flow.leadTimeWeeksPerReq.toFixed(1)}</b> work-weeks)</div>
              <div className="text-sm text-gray-300">Annual waiting time: <b>{Math.round(numbers.flow.annualWaitingDays).toLocaleString()}</b> days</div>
              <div className="text-sm text-gray-300">WIP (Little's Law est.): <b>{numbers.flow.wipApprox.toFixed(1)}</b> tickets in-flight</div>
              <p className="text-xs text-gray-400 mt-3">Lead time = serialized approvals + IT; Security/Legal applied to a % of requests.</p>
            </div>
          </aside>
        </CardContent>
      </Card>
    </div>
  )
}

type RadioProps = {
  name: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  label: string
  hint?: string
}
function Radio({ name, value, checked, onChange, label, hint }: RadioProps) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer ${checked ? 'border-gray-400 bg-gray-700' : 'border-gray-600 bg-gray-800'}`}
      onClick={() => onChange(value)}
    >
      <input type="radio" name={name} checked={checked} onChange={() => onChange(value)} className="mt-1" />
      <div>
        <div className="text-sm text-white leading-5">{label}</div>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
    </label>
  )
}

type ChipProps = { value: string; label: string; selected: boolean; onSelect: (v: string) => void }
function Chip({ value, label, selected, onSelect }: ChipProps) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`px-3 py-2 rounded-2xl text-sm border transition ${selected ? 'bg-gray-700 border-gray-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500'}`}
    >
      {label}
    </button>
  )
}

// --- Tiny dev sanity tests (run in browser console, non-blocking UI) ---
;(function runQuickTests(){
  if (typeof window === 'undefined') return
  try {
    console.groupCollapsed('Ticket Estimator quick tests')
    console.assert(rangeMid('dp_small') === 50, 'rangeMid dp_small should be 50')
    console.assert(rangeMid('bi_large') === 6000, 'rangeMid bi_large should be 6000')
    console.assert(assetFactor('assets_large') === 1.5, 'assetFactor assets_large should be 1.5')
    console.assert(complianceFactor('high') === 2.0, 'complianceFactor high should be 2.0')
    console.assert(governanceFactor('selfservice') === 0.75, 'governanceFactor selfservice should be 0.75')
    // Baseline math sanity (defaults):
    const base = (300 * 5) + (6000 * 1.5) // 10500
    const factor = 1.5 * 2.0 * 1.0        // 3.0
    const annual = Math.round(base * factor * 0.75 * (0.5 * 0.8 * 0.7))
    console.assert(annual === 6615, 'annual default should be 6615')
    const monthly = Math.round(annual / 12)
    console.assert(monthly === 6615/12 && monthly === 551, 'monthly default should be 551')
    const leadDays = (1 + 3 + (0.3 * 4)) + 5 // 10.2
    console.assert(Math.abs(leadDays - 10.2) < 1e-9, 'lead time days calc')
    // Hours sanity
    const currentBase = (1.0*0.5) + (6.0*0.5) + (0.3*(0.5*0.5)) + (0.2*(1.0*0.5))
    const currentAdj = currentBase * 0.6 // 2.205
    console.assert(Math.abs(currentAdj - 2.205) < 1e-9, 'current hours per req calc')
    const futureBase = (0.25*0.5) + 0 + (0.1*(0.1*0.5)) + (0.1*(0.25*0.5))
    const futureAdj = futureBase * 0.6 // 0.0855
    console.assert(Math.abs(futureAdj - 0.0855) < 1e-9, 'future hours per req calc')
    // WIP sanity
    const wip = (6615/365) * 10.2
    console.assert(Math.abs(wip - 184.86) < 0.5, 'wip approx close to 184.86')
    console.groupEnd()
  } catch (e) {
    console.warn('Quick tests error', e)
  }
})()

export default function App() {
  return <TicketCalculator />
}
