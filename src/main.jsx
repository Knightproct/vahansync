import React, { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { acceptInvitation, completeComponentService, createComponent, createVehicle, createInvitation, createVendor, createWorkOrder, downloadFile, exportResource, getComponents, getCurrentUser, getDocuments, getExpenses, getMaintenancePlans, getNotifications, getParts, getPurchaseOrders, getSubscription, getVehicles, getVendors, getWorkOrders, login, signupOrganization, updateComponent, updateVehicle } from './api'

const isPublicPage = ['/', '/signup'].includes(window.location.pathname) || window.location.pathname.startsWith('/invite/')

const navItems = [
  { id: 'overview', label: 'Overview', icon: '⌂', permissions: ['fleet', 'maintenance', 'finance', 'compliance'] },
  { id: 'fleet', label: 'Fleet', icon: '▱', count: '48', permissions: ['fleet'] },
  { id: 'maintenance', label: 'Maintenance', icon: '⌁', count: '07', permissions: ['maintenance'] },
  { id: 'workshop', label: 'Workshop', icon: '⌘', permissions: ['workshop', 'inventory'] },
  { id: 'documents', label: 'Documents', icon: '▤', count: '12', permissions: ['compliance'] },
  { id: 'costs', label: 'Costs & finance', icon: '₹', permissions: ['finance'] },
]

const maintenance = [
  { title: 'Brake pad replacement', vehicle: 'KA 03 MN 7712', due: 'Today', priority: 'High', icon: '◉', color: 'red' },
  { title: 'Engine oil & filter', vehicle: 'TN 38 AB 1904', due: 'Tomorrow', priority: 'Medium', icon: '◌', color: 'amber' },
  { title: 'Quarterly inspection', vehicle: 'MH 12 QX 4821', due: '18 Jun', priority: 'Low', icon: '✓', color: 'green' },
]

const documents = [
  { name: 'Fitness certificate', vehicle: 'MH 12 QX 4821', date: '18 Jun 2024', days: '3 days', tone: 'danger' },
  { name: 'Insurance policy', vehicle: 'GJ 01 RT 6388', date: '24 Jun 2024', days: '9 days', tone: 'warning' },
  { name: 'PUC certificate', vehicle: 'TN 38 AB 1904', date: '02 Jul 2024', days: '17 days', tone: 'neutral' },
]

const inventory = [
  { part: 'Brake pad set · Front axle', sku: 'BP-AL-3520-F', category: 'Brakes', stock: 8, min: 5, cost: '₹4,850', supplier: 'TVS Autoparts' },
  { part: '15W40 Diesel engine oil', sku: 'OIL-15W40-20L', category: 'Lubricants', stock: 12, min: 10, cost: '₹3,260', supplier: 'Castrol India' },
  { part: 'Air filter · Prima series', sku: 'AF-TATA-5530', category: 'Filters', stock: 3, min: 6, cost: '₹1,420', supplier: 'Fleetguard' },
  { part: 'Clutch plate assembly', sku: 'CL-EC-6042', category: 'Drivetrain', stock: 2, min: 2, cost: '₹18,900', supplier: 'Eicher Motors' },
]

function App() {
  const [active, setActive] = useState('overview')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [toast, setToast] = useState('')
  const [fleet, setFleet] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [parts, setParts] = useState([])
  const [documentsData, setDocumentsData] = useState([])
  const [expenses, setExpenses] = useState([])
  const [components, setComponents] = useState([])
  const [maintenancePlans, setMaintenancePlans] = useState([])
  const [vendors, setVendors] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [token, setToken] = useState(() => window.sessionStorage.getItem('vahana:access-token'))
  const [apiState, setApiState] = useState('loading')
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isPublicPage) return
    const bootstrap = async () => {
      try {
        let accessToken = token
        if (!accessToken && import.meta.env.DEV) {
          const session = await login(import.meta.env.VITE_DEV_EMAIL || 'admin@example.com', import.meta.env.VITE_DEV_PASSWORD || 'ChangeMe!123')
          accessToken = session.access_token
          window.sessionStorage.setItem('vahana:access-token', accessToken)
          setToken(accessToken)
        }
        if (!accessToken) {
          setApiState('unauthenticated')
          return
        }
        const loadedUser = await getCurrentUser(accessToken)
        const [loadedSubscription, loadedFleet, loadedWorkOrders, loadedParts, loadedDocuments, loadedExpenses, loadedComponents, loadedPlans, loadedVendors, loadedPurchaseOrders, loadedNotifications] = await Promise.all([
          getSubscription(accessToken),
          getVehicles(accessToken),
          getWorkOrders(accessToken),
          getParts(accessToken),
          getDocuments(accessToken),
          getExpenses(accessToken),
          getComponents(accessToken),
          getMaintenancePlans(accessToken),
          getVendors(accessToken),
          getPurchaseOrders(accessToken),
          getNotifications(accessToken),
        ])
        setCurrentUser(loadedUser)
        setSubscription(loadedSubscription)
        setFleet(loadedFleet)
        setWorkOrders(loadedWorkOrders)
        setParts(loadedParts)
        setDocumentsData(loadedDocuments)
        setExpenses(loadedExpenses)
        setComponents(loadedComponents)
        setMaintenancePlans(loadedPlans)
        setVendors(loadedVendors)
        setPurchaseOrders(loadedPurchaseOrders)
        setNotifications(loadedNotifications)
        setApiState('ready')
      } catch (error) {
        if (
          error.message === 'Not authenticated'
          || error.message.includes('401')
          || error.message.includes('authentication credentials')
        ) {
          window.sessionStorage.removeItem('vahana:access-token')
          setToken(null)
          setApiState('unauthenticated')
          return
        }
        setApiError(error.message)
        setApiState('error')
      }
    }
    bootstrap()
  }, [token])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const filteredVehicles = useMemo(
    () => fleet.filter((vehicle) => `${vehicle.reg} ${vehicle.model} ${vehicle.depot}`.toLowerCase().includes(search.toLowerCase())),
    [fleet, search],
  )

  const title = navItems.find((item) => item.id === active)?.label ?? 'Overview'
  const rolePermissions = currentUser?.role === 'owner' ? new Set(['*']) : new Set({
    fleet_manager: ['fleet', 'maintenance', 'compliance'],
    inventory_manager: ['inventory', 'workshop'],
    driver: ['fleet', 'maintenance'],
    technician: ['maintenance', 'workshop', 'inventory'],
    accountant: ['finance'],
  }[currentUser?.role] || [])
  const visibleNavItems = navItems.filter((item) => rolePermissions.has('*') || item.permissions.some((permission) => rolePermissions.has(permission)))

  const notify = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  if (window.location.pathname === '/signup') return <SignupScreen onAuthenticated={(accessToken) => { window.sessionStorage.setItem('vahana:access-token', accessToken); window.location.href = '/app' }} />
  if (window.location.pathname.startsWith('/invite/')) return <InvitationScreen tokenFromPath={window.location.pathname.split('/').pop()} onAuthenticated={(accessToken) => { window.sessionStorage.setItem('vahana:access-token', accessToken); window.location.href = '/app' }} />
  if (window.location.pathname === '/') return <Landing />
  if (apiState === 'loading') return <AppState title="Connecting to VahanSync" detail="Loading your organization data securely..." />
  if (apiState === 'error') return <AppState title="VahanSync API unavailable" detail={`${apiError}. Start the backend service and reload this workspace.`} />
  if (apiState === 'unauthenticated') return <LoginScreen onAuthenticated={(accessToken) => { window.sessionStorage.setItem('vahana:access-token', accessToken); setToken(accessToken) }} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>VahanSync</strong>
            <span>Fleet operations OS</span>
          </div>
        </div>

          <div className="workspace-switcher">
          <div className="workspace-avatar">{(currentUser?.full_name || 'VS').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div>
            <span className="eyebrow">Workspace</span>
            <strong>{currentUser?.full_name || 'Rajput Logistics'}</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <div className="role-chip">{currentUser?.role?.replaceAll('_', ' ') || 'workspace'} · {subscription?.plan?.name || 'plan'}</div>

        <nav className="nav-list">
          <span className="nav-section">Command centre</span>
          {visibleNavItems.map((item) => (
            <button className={`nav-item ${active === item.id ? 'active' : ''}`} key={item.id} onClick={() => setActive(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count && <em>{item.count}</em>}
            </button>
          ))}
          <span className="nav-section nav-section-spaced">Workspace</span>
          <button className="nav-item" onClick={() => notify('Reports are being prepared for your workspace.')}>
            <span className="nav-icon">▥</span><span>Reports</span>
          </button>
          <button className="nav-item" onClick={() => notify('Settings are available to workspace admins.')}>
            <span className="nav-icon">⚙</span><span>Settings</span>
          </button>
          {currentUser?.role === 'owner' && <button className="nav-item" onClick={() => setShowInvite(true)}>
            <span className="nav-icon">+</span><span>Invite teammate</span>
          </button>}
        </nav>

        <div className="sidebar-footer">
          <div className="help-card">
            <div className="help-icon">?</div>
            <div><strong>Need a hand?</strong><span>Talk to your fleet advisor</span></div>
            <button onClick={() => notify('Your fleet advisor will reach out shortly.')}>↗</button>
          </div>
          <div className="user-row">
            <div className="user-avatar">{(currentUser?.full_name || 'VS').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div><strong>{currentUser?.full_name || 'Workspace user'}</strong><span>{currentUser?.role?.replaceAll('_', ' ') || 'Member'}</span></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>VahanSync</span><b>/</b><strong>{title}</strong></div>
          <div className="top-actions">
            <span className="sync-status"><i></i> Live sync</span>
            <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles, parts, docs..." /><kbd>⌘ K</kbd></div>
            <button className="icon-button" onClick={() => notify(notifications.length ? `${notifications.filter((item) => item.status === 'unread').length} operational notifications need attention.` : 'You are all caught up.')}>♢{notifications.some((item) => item.status === 'unread') && <i></i>}</button>
            <button className="icon-button" onClick={() => notify('Help centre opened in a new tab.')}>?</button>
          </div>
        </header>

        <div className="page">
          {active === 'overview' && <Overview role={currentUser?.role} vehicles={fleet} workOrders={workOrders} documents={documentsData} expenses={expenses} onNotify={notify} />}
          {active === 'fleet' && <Fleet role={currentUser?.role} vehicles={filteredVehicles} components={components} token={token} onAdd={() => setShowAdd(true)} onNotify={notify} onVehicleUpdated={(updated) => setFleet((current) => current.map((item) => item.id === updated.id ? updated : item))} onComponentCreated={(component) => setComponents((current) => [component, ...current])} onComponentUpdated={(updated) => setComponents((current) => current.map((item) => item.id === updated.id ? updated : item))} />}
          {active === 'maintenance' && <Maintenance role={currentUser?.role} workOrders={workOrders} components={components} plans={maintenancePlans} vehicles={fleet} token={token} onCreated={(workOrder) => setWorkOrders((current) => [workOrder, ...current])} onNotify={notify} />}
          {active === 'workshop' && <Workshop token={token} parts={parts} vendors={vendors} purchaseOrders={purchaseOrders} onVendorCreated={(vendor) => setVendors((current) => [...current, vendor])} onNotify={notify} />}
          {active === 'documents' && <Documents documents={documentsData} vehicles={fleet} onNotify={notify} />}
          {active === 'costs' && <Costs expenses={expenses} vehicles={fleet} onNotify={notify} />}
        </div>
      </main>

      {showAdd && currentUser?.role === 'fleet_manager' && <AddVehicleModal onClose={() => setShowAdd(false)} onSave={async (vehicle) => { try { const createdVehicle = await createVehicle(token, vehicle); setFleet((currentFleet) => [createdVehicle, ...currentFleet]); setShowAdd(false); notify('Vehicle added to your fleet.'); } catch (error) { notify(error.message) } }} />}
      {showInvite && <InviteModal token={token} onClose={() => setShowInvite(false)} onCreated={(invite) => { setShowInvite(false); notify(`Invite created for ${invite.email}. Share the secure invitation link.`) }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  )
}

function AppState({ title, detail }) {
  return <div className="app-state"><div className="brand-mark">V</div><h1>{title}</h1><p>{detail}</p></div>
}

function Landing() {
  return <div className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href="/"><span className="brand-mark">V</span><span><strong>VahanSync</strong><small>Fleet operations OS</small></span></a>
      <nav><a href="#platform">Platform</a><a href="#workflows">Workflows</a><a href="#india">Built for India</a></nav>
      <div className="landing-actions"><a className="landing-text-link" href="/signup">Create organisation</a><a className="landing-login" href="/app">Sign in <span>→</span></a></div>
    </header>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="landing-kicker">The operating system for modern fleets</span>
          <h1>Run every vehicle, workshop, and rupee from one calm command centre.</h1>
          <p>VahanSync brings fleet health, component lifecycle, maintenance, inventory, compliance, fuel, tolls, and finance together for Indian operators.</p>
          <div className="hero-actions"><a className="hero-button" href="/signup">Start your organisation <span>↗</span></a><a className="hero-text-link" href="#platform">Explore the platform <span>↓</span></a></div>
          <div className="hero-proof"><span>●</span><span>One source of truth for operations</span><span>·</span><span>INR-native cost controls</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-window"><div className="visual-top"><span className="visual-dot"></span><span className="visual-dot"></span><span className="visual-dot"></span><small>VahanSync command centre</small></div><div className="visual-body"><div className="visual-sidebar"><b>V</b><i></i><i></i><i></i><i></i></div><div className="visual-dashboard"><span>FLEET HEALTH</span><strong>94.2%</strong><div className="visual-bars"><i></i><i></i><i></i><i></i></div><div className="visual-cards"><div></div><div></div><div></div></div></div></div></div>
          <div className="floating-card"><span>Compliance readiness</span><strong>98%</strong><small>↑ 12% this month</small></div>
        </div>
      </section>
      <section className="trust-row"><span>DESIGNED FOR</span><strong>Logistics operators</strong><strong>Contract fleets</strong><strong>Workshop networks</strong><strong>Transport enterprises</strong></section>
      <section className="platform-section" id="platform"><div className="section-intro"><span className="landing-kicker">One connected platform</span><h2>From vehicle register to financial close.</h2><p>Every operational detail stays connected, so teams act on the same live picture instead of chasing spreadsheets.</p></div><div className="feature-grid"><Feature icon="01" title="Fleet intelligence" text="Track every vehicle, component, depot, status, and odometer movement in one live register." /><Feature icon="02" title="Workshop control" text="Turn maintenance plans into work orders, parts issues, stock movements, and measurable uptime." /><Feature icon="03" title="Compliance & cost" text="Keep documents, expiry alerts, fuel, tolls, GST-ready expenses, and approvals audit-ready." /></div></section>
      <section className="india-section" id="india"><div><span className="landing-kicker">Built for Indian operations</span><h2>Local realities, enterprise discipline.</h2><p>VahanSync speaks the language of Indian fleet teams: registration numbers, FASTag, PUC, fitness, insurance, GST, INR paise precision, and multi-depot control.</p><a className="hero-text-link" href="/app">See the command centre <span>→</span></a></div><div className="india-stat-grid"><div><strong>24×7</strong><span>Operational visibility</span></div><div><strong>₹</strong><span>Paise-precise ledgers</span></div><div><strong>360°</strong><span>Vehicle lifecycle</span></div><div><strong>1</strong><span>Source of truth</span></div></div></section>
      <section className="cta-section" id="workflows"><span className="landing-kicker">Make every kilometre count</span><h2>Your fleet has a lot moving.<br />Your system should feel simple.</h2><a className="hero-button" href="/app">Enter VahanSync <span>↗</span></a></section>
    </main>
    <footer className="landing-footer"><a className="landing-brand" href="/"><span className="brand-mark">V</span><span><strong>VahanSync</strong><small>Fleet operations OS</small></span></a><span>© 2026 VahanSync. Built for fleet operators in India.</span><a href="/app">Sign in →</a></footer>
  </div>
}

function Feature({ icon, title, text }) {
  return <article className="feature-card"><span>{icon}</span><h3>{title}</h3><p>{text}</p><a href="/app">Explore <b>→</b></a></article>
}

function LoginScreen({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    try {
      const session = await login(email, password)
      onAuthenticated(session.access_token)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <div className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-mark">V</div><span className="eyebrow">VahanSync</span><h1>Sign in to your workspace</h1><p>Secure access to your fleet operations command centre.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" type="submit">Sign in</button><a className="login-link" href="/signup">Create a new organisation</a></form></div>
}

function SignupScreen({ onAuthenticated }) {
  const [form, setForm] = useState({ organization_name: '', full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    try {
      const result = await signupOrganization(form)
      onAuthenticated(result.access_token)
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return <div className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-mark">V</div><span className="eyebrow">VahanSync onboarding</span><h1>Create your organisation</h1><p>Your account becomes the organisation owner. Invite the rest of your team after setup.</p><label>Organisation name<input value={form.organization_name} onChange={(event) => setForm({ ...form, organization_name: event.target.value })} required /></label><label>Your full name<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label><label>Work email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Password<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" type="submit">Create organisation</button><a className="login-link" href="/app">Already have an account? Sign in</a></form></div>
}

function InvitationScreen({ tokenFromPath, onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    try {
      const result = await acceptInvitation({ token: tokenFromPath, password })
      onAuthenticated(result.access_token)
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return <div className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-mark">V</div><span className="eyebrow">VahanSync invitation</span><h1>Join your organisation</h1><p>Set a password to activate your assigned role and workspace.</p><label>Password<input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" type="submit">Accept invitation</button><a className="login-link" href="/app">Already active? Sign in</a></form></div>
}

function InviteModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'fleet_manager' })
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    try {
      const result = await createInvitation(token, form)
      onCreated(result)
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><div className="modal-header"><div><span className="eyebrow">Organisation access</span><h2>Invite a teammate</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div><p>Assign one workspace role. The invitee creates their own password from the secure link.</p><label>Full name<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="fleet_manager">Fleet manager</option><option value="inventory_manager">Inventory manager</option><option value="driver">Driver</option><option value="technician">Mechanic / technician</option><option value="accountant">Accountant</option></select></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Create invitation</button></div></form></div>
}

function PageHeader({ eyebrow, title, subtitle, action, onAction }) {
  return <div className="page-header">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>
    {action && <button className="primary-button" onClick={onAction}><span>+</span>{action}</button>}
  </div>
}

function Overview({ role, vehicles: fleet, workOrders, documents, expenses, onAdd, onNotify }) {
  const workspace = {
    owner: ['Owner command centre', 'Control people, policy, billing, and every operational area.'],
    fleet_manager: ['Fleet manager workspace', 'Monitor availability, vehicle health, assignments, and compliance risk.'],
    inventory_manager: ['Inventory manager workspace', 'Keep every workshop supplied with the right part at the right time.'],
    driver: ['Driver workspace', 'See your assigned vehicle, open defects, inspections, and route readiness.'],
    technician: ['Technician workspace', 'Work through assigned jobs, parts, checklists, and completion updates.'],
    accountant: ['Finance workspace', 'Keep expenses, GST, vendors, and reconciliations accurate.'],
  }[role] || ['Operations workspace', 'Here’s what’s happening across your fleet today.']
  const canSeeFleet = ['owner', 'fleet_manager'].includes(role)
  const canSeeMaintenance = ['owner', 'fleet_manager', 'technician'].includes(role)
  const canSeeFinance = ['owner', 'accountant'].includes(role)
  return <div>
    <PageHeader eyebrow={workspace[0]} title={workspace[1]} subtitle="VahanSync shows the work relevant to your role, with organisation-wide controls behind it." />
    <div className="metric-grid">
      <MetricCard label="Fleet health" value="86.4%" change="+2.8%" detail="vs last month" icon="◒" tone="navy" />
      <MetricCard label="Active vehicles" value={`${fleet.filter((vehicle) => vehicle.status === 'On route').length} / ${fleet.length}`} change="+3" detail="this month" icon="▱" tone="blue" />
      <MetricCard label="Open work orders" value={workOrders.length} change="live" detail="from maintenance planner" icon="⌁" tone="orange" />
      <MetricCard label="Recorded cost" value={`₹${(expenses.reduce((sum, expense) => sum + expense.amount_paise, 0) / 100000).toFixed(1)}L`} change="live" detail="from expense ledger" icon="₹" tone="purple" />
    </div>
    <div className="content-grid">
      {canSeeFleet && <section className="panel fleet-panel">
        <PanelHeading title="Fleet overview" meta="48 vehicles" action="View all" onAction={() => onNotify('Fleet view selected from the overview.')} />
        <div className="fleet-summary">
          <div className="donut-wrap"><div className="donut"><strong>86%</strong><span>healthy</span></div></div>
          <div className="legend-list">
            <Legend color="green" label="On route" value="34" sub="71%" />
            <Legend color="orange" label="In workshop" value="05" sub="10%" />
            <Legend color="blue" label="Idle / parked" value="09" sub="19%" />
          </div>
        </div>
        <div className="mini-table">
          <div className="mini-row mini-head"><span>Vehicle</span><span>Status</span><span>Health</span></div>
          {fleet.slice(0, 3).map((vehicle) => <div className="mini-row" key={vehicle.reg}><div className="vehicle-cell"><div className={`vehicle-dot ${vehicle.accent}`}></div><div><strong>{vehicle.reg}</strong><small>{vehicle.model}</small></div></div><Status status={vehicle.status} /><div className="health-cell"><span>{vehicle.health}%</span><div className="health-bar"><i style={{ width: `${vehicle.health}%` }}></i></div></div></div>)}
        </div>
      </section>}
      {canSeeMaintenance && <section className="panel">
        <PanelHeading title="Maintenance queue" meta={`${workOrders.length} open work orders`} action="Open planner" onAction={() => onNotify('Maintenance planner opened.')} />
        <div className="maintenance-list">{workOrders.slice(0, 3).map((item) => <div className="maintenance-item" key={item.id}><div className={`maintenance-icon ${item.priority === 'High' ? 'red' : item.priority === 'Low' ? 'green' : 'amber'}`}>⌁</div><div className="maintenance-copy"><strong>{item.title}</strong><span>{fleet.find((vehicle) => vehicle.id === item.vehicle_id)?.reg || 'Vehicle linked'}</span></div><div className="maintenance-due"><span>{item.due_date || 'Unscheduled'}</span><small className={`priority ${item.priority === 'High' ? 'red' : item.priority === 'Low' ? 'green' : 'amber'}`}>{item.priority}</small></div></div>)}</div>
        <button className="full-width-button" onClick={() => onNotify('New service request started.')}>+ Create service request</button>
      </section>}
    </div>
    <div className="content-grid bottom-grid">
      {canSeeFinance && <section className="panel cost-panel"><PanelHeading title="Operating cost" meta={`${expenses.length} recorded expenses`} action="Detailed report" onAction={() => onNotify('Cost report is ready to review.')} /><div className="chart-wrap"><div className="y-labels"><span>₹18L</span><span>₹12L</span><span>₹6L</span><span>₹0</span></div><div className="chart"><div className="grid-lines"><i></i><i></i><i></i><i></i></div><svg viewBox="0 0 650 180" preserveAspectRatio="none" aria-label="Operating cost chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2a8a82" stopOpacity=".2" /><stop offset="100%" stopColor="#2a8a82" stopOpacity="0" /></linearGradient></defs><path d="M0 128 C40 116 58 124 90 101 S145 115 172 88 S230 74 260 92 S302 84 335 96 S380 57 420 72 S464 83 500 48 S551 68 575 36 S617 47 650 18 L650 180 L0 180Z" fill="url(#chartFill)" /><path d="M0 128 C40 116 58 124 90 101 S145 115 172 88 S230 74 260 92 S302 84 335 96 S380 57 420 72 S464 83 500 48 S551 68 575 36 S617 47 650 18" fill="none" stroke="#2a8a82" strokeWidth="3" strokeLinecap="round" /></svg><div className="x-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div></div></div></section>}
      {canSeeFleet && <section className="panel"><PanelHeading title="Documents expiring soon" meta={`${documents.length} documents in vault`} action="View vault" onAction={() => onNotify('Document vault opened.')} /><div className="document-list">{documents.slice(0, 3).map((doc) => <div className="document-item" key={doc.id}><div className="doc-icon warning">▤</div><div className="document-copy"><strong>{doc.name}</strong><span>{fleet.find((vehicle) => vehicle.id === doc.vehicle_id)?.reg || 'Organization document'} · {doc.expires_on}</span></div><span className="days-pill warning">{doc.status}</span></div>)}</div></section>}
    </div>
  </div>
}

function MetricCard({ label, value, change, detail, icon, tone }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-change"><span className={change.startsWith('-') ? 'down' : ''}>{change}</span> {detail}</div></div>
}
function PanelHeading({ title, meta, action, onAction }) { return <div className="panel-heading"><div><h2>{title}</h2><span>{meta}</span></div><button onClick={onAction}>{action} <span>→</span></button></div> }
function Legend({ color, label, value, sub }) { return <div className="legend-item"><i className={color}></i><span>{label}</span><strong>{value}</strong><small>{sub}</small></div> }
function Status({ status }) { return <span className={`status ${status === 'On route' ? 'on-route' : status === 'In workshop' ? 'in-workshop' : 'due'}`}><i></i>{status}</span> }

function Fleet({ role, vehicles: rows, components, token, onAdd, onNotify, onVehicleUpdated, onComponentCreated, onComponentUpdated }) {
  const [componentForm, setComponentForm] = useState({ vehicle_id: rows[0]?.id || '', name: '', component_type: '', installed_at_km: '', service_interval_km: '' })
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [editingComponent, setEditingComponent] = useState(null)
  const downloadExport = async () => {
    try {
      const blob = await exportResource(token, 'vehicles')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'vehicles.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) { onNotify(error.message) }
  }
  const addComponent = async (event) => {
    event.preventDefault()
    try {
      const component = await createComponent(token, { ...componentForm, vehicle_id: Number(componentForm.vehicle_id), installed_at_km: Number(componentForm.installed_at_km || 0), service_interval_km: componentForm.service_interval_km ? Number(componentForm.service_interval_km) : null })
      onComponentCreated(component)
      setComponentForm({ vehicle_id: rows[0]?.id || '', name: '', component_type: '', installed_at_km: '', service_interval_km: '' })
      onNotify('Component attached to vehicle.')
    } catch (error) { onNotify(error.message) }
  }
  return <div><PageHeader eyebrow="Operations" title="Fleet" subtitle="Every vehicle, every component, one source of truth." action={role === 'fleet_manager' ? 'Add vehicle' : undefined} onAction={onAdd} /><div className="toolbar"><div className="filter-tabs"><button className="selected">Live vehicles <span>{rows.length}</span></button></div><button className="secondary-button" onClick={downloadExport}>Export vehicles ↗</button></div><section className="panel table-panel"><div className="table-header"><div><h2>Vehicle register</h2><span>Live organization records</span></div></div><div className="data-table"><div className="data-row data-head"><span>Vehicle</span><span>Depot</span><span>Driver</span><span>Status</span><span>Health</span><span></span></div>{rows.map((v) => <div className="data-row" key={v.reg}><div className="vehicle-cell"><div className={`vehicle-dot ${v.accent}`}></div><div><strong>{v.reg}</strong><small>{v.model} · {v.km}</small></div></div><span>{v.depot}</span><span>{v.driver}</span><Status status={v.status} /><div className="health-cell"><span>{v.health}%</span><div className="health-bar"><i style={{ width: `${v.health}%` }}></i></div></div>{role === 'fleet_manager' ? <button className="row-more" onClick={() => setEditingVehicle(v)}>Edit</button> : <span />}</div>)}</div></section>
    {role === 'fleet_manager' && <section className="panel table-panel"><div className="table-header"><div><h2>Component lifecycle</h2><span>Attach components, monitor odometer service thresholds, and close the maintenance cycle.</span></div></div><form className="form-grid" onSubmit={addComponent}><select value={componentForm.vehicle_id} onChange={(event) => setComponentForm({ ...componentForm, vehicle_id: event.target.value })} required>{rows.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input placeholder="Component name" value={componentForm.name} onChange={(event) => setComponentForm({ ...componentForm, name: event.target.value })} required /><input placeholder="Type (brakes, tyre...)" value={componentForm.component_type} onChange={(event) => setComponentForm({ ...componentForm, component_type: event.target.value })} required /><input type="number" placeholder="Installed odometer km" value={componentForm.installed_at_km} onChange={(event) => setComponentForm({ ...componentForm, installed_at_km: event.target.value })} /><input type="number" placeholder="Service interval km" value={componentForm.service_interval_km} onChange={(event) => setComponentForm({ ...componentForm, service_interval_km: event.target.value })} /><button className="primary-button" type="submit">Attach component</button></form><div className="data-table">{components.map((component) => { const vehicle = rows.find((item) => item.id === component.vehicle_id); const currentKm = vehicle?.odometer_km || 0; const due = component.next_service_km && currentKm >= component.next_service_km; return <div className="data-row" key={component.id}><span>{component.name}<small>{component.component_type}</small></span><span>{vehicle?.reg || 'Vehicle'}</span><span>{currentKm.toLocaleString()} / next {component.next_service_km || '—'} km</span><Status status={due ? 'In workshop' : component.status} /><button className="row-more" onClick={() => setEditingComponent(component)}>Edit</button></div> })}</div></section>}
    {editingVehicle && <EditVehicleModal vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} onSave={async (payload) => { const updated = await updateVehicle(token, editingVehicle.id, payload); onVehicleUpdated(updated); setEditingVehicle(null); onNotify('Vehicle updated.') }} />}
    {editingComponent && <EditComponentModal component={editingComponent} token={token} onClose={() => setEditingComponent(null)} onSave={async (payload) => { const updated = await updateComponent(token, editingComponent.id, payload); onComponentUpdated(updated); setEditingComponent(null); onNotify('Component lifecycle updated.') }} onServiceComplete={async (odometerKm) => { const updated = await completeComponentService(token, editingComponent.id, odometerKm); onComponentUpdated(updated); setEditingComponent(null); onNotify('Component service completed and next threshold recalculated.') }} />}
  </div>
}

function Maintenance({ role, workOrders, components, plans, vehicles: fleet, token, onCreated, onNotify }) {
  const createOrder = async () => {
    const vehicle = fleet[0]
    if (!vehicle) return
    try {
      const workOrder = await createWorkOrder(token, { vehicle_id: vehicle.id, title: 'New inspection request', priority: 'Medium', status: 'Open' })
      onCreated(workOrder)
      onNotify('Work order created.')
    } catch (error) {
      onNotify(error.message)
    }
  }

  const download = (id) => { downloadFile(token, `/api/v1/work-orders/${id}/download`, `WO-${id}.html`).catch((error) => onNotify(error.message)) }
  return <div><PageHeader eyebrow="Workshop control" title="Maintenance" subtitle="Plan preventive care and close every work order on time." action={role !== 'technician' ? 'New work order' : undefined} onAction={createOrder} /><div className="metric-grid compact"><MetricCard label="Open work orders" value={workOrders.length} change="live" detail="assigned records" icon="◷" tone="orange" /><MetricCard label="In progress" value={workOrders.filter((item) => item.status === 'In progress').length} change="live" detail="active jobs" icon="⌁" tone="blue" /><MetricCard label="Tracked components" value={components.length} change="live" detail={`${plans.length} service plans`} icon="◒" tone="green" /><MetricCard label="Preventive compliance" value="Live" change="odometer" detail="component thresholds" icon="✓" tone="purple" /></div><section className="panel table-panel"><div className="table-header"><div><h2>Work order planner</h2><span>{role === 'technician' ? 'Your assigned jobs' : 'All active and scheduled jobs'}</span></div></div><div className="data-table"><div className="data-row data-head"><span>Work order</span><span>Vehicle</span><span>Assigned to</span><span>Due</span><span>Priority</span><span>Status</span><span></span></div>{workOrders.map((item) => <div className="data-row" key={item.id}><div className="workorder-cell"><div className="maintenance-icon small amber">⌁</div><div><strong>{item.title}</strong><small>WO-{item.id}</small></div></div><span>{fleet.find((vehicle) => vehicle.id === item.vehicle_id)?.reg || 'Vehicle linked'}</span><span>{item.assigned_to || 'Assigned technician'}</span><span>{item.due_date || 'Unscheduled'}</span><span className={`priority ${item.priority === 'High' ? 'red' : item.priority === 'Low' ? 'green' : 'amber'}`}>{item.priority}</span><Status status={item.status === 'In progress' ? 'In workshop' : 'On route'} /><button className="row-more" onClick={() => download(item.id)}>Download</button></div>)}</div></section></div>
}

function Workshop({ token, parts, vendors, purchaseOrders, onVendorCreated, onNotify }) {
  const submittedOrders = purchaseOrders.filter((order) => ['Submitted', 'Approved', 'Partially received'].includes(order.status))
  const [vendorForm, setVendorForm] = useState({ name: '', vendor_type: 'Parts supplier', gstin: '', phone: '', email: '' })
  const addVendor = async (event) => {
    event.preventDefault()
    try {
      const vendor = await createVendor(token, vendorForm)
      onVendorCreated(vendor)
      setVendorForm({ name: '', vendor_type: 'Parts supplier', gstin: '', phone: '', email: '' })
      onNotify('Vendor added.')
    } catch (error) { onNotify(error.message) }
  }
  return <div><PageHeader eyebrow="Workshop & inventory" title="Workshop inventory" subtitle="Know what is on the shelf, what is moving, and what needs ordering." action="Receive stock" onAction={() => onNotify('Stock receipt flow started.')} /><div className="inventory-banner"><div className="inventory-stat"><span className="inventory-number">₹{(parts.reduce((total, part) => total + part.quantity_on_hand * part.unit_cost_paise, 0) / 100000).toFixed(1)}L</span><span>Total inventory value</span></div><div className="inventory-stat"><span className="inventory-number">{parts.reduce((total, part) => total + part.quantity_on_hand, 0)}</span><span>Parts in stock</span></div><div className="inventory-stat alert"><span className="inventory-number">{parts.filter((part) => part.quantity_on_hand <= part.reorder_level).length.toString().padStart(2, '0')}</span><span>Below reorder point</span></div><button onClick={() => onNotify(`${submittedOrders.length} active purchase orders across ${vendors.length} vendors.`)}>View procurement →</button></div><section className="panel table-panel"><div className="table-header"><div><h2>Parts catalogue</h2><span>{purchaseOrders.length} purchase orders · {vendors.length} vendors</span></div><button className="filter-button" onClick={() => exportResource(token, 'parts').then((blob) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'parts.csv'; link.click(); URL.revokeObjectURL(url) })}>Export parts</button></div><div className="data-table inventory-table"><div className="data-row data-head"><span>Part</span><span>Category</span><span>In stock</span><span>Unit cost</span><span>Supplier</span><span></span></div>{parts.map((part) => <div className="data-row" key={part.sku}><div className="part-cell"><div className="part-icon">▦</div><div><strong>{part.name}</strong><small>{part.sku}</small></div></div><span>{part.category}</span><span><strong className={part.quantity_on_hand <= part.reorder_level ? 'low-stock' : ''}>{part.quantity_on_hand}</strong> <small>/ min {part.reorder_level}</small></span><span>₹{(part.unit_cost_paise / 100).toLocaleString('en-IN')}</span><span>{part.supplier || 'Unassigned'}</span><button className="row-more">•••</button></div>)}</div></section><section className="panel table-panel"><div className="table-header"><div><h2>Vendor management</h2><span>Active suppliers connected to procurement</span></div></div><form className="form-grid" onSubmit={addVendor}><input placeholder="Vendor name" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} required /><input placeholder="Vendor type" value={vendorForm.vendor_type} onChange={(event) => setVendorForm({ ...vendorForm, vendor_type: event.target.value })} /><input placeholder="GSTIN" value={vendorForm.gstin} onChange={(event) => setVendorForm({ ...vendorForm, gstin: event.target.value })} /><input placeholder="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} /><input placeholder="Email" value={vendorForm.email} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} /><button className="primary-button" type="submit">Add vendor</button></form><div className="data-table">{vendors.map((vendor) => <div className="data-row" key={vendor.id}><span><strong>{vendor.name}</strong><small>{vendor.vendor_type}</small></span><span>{vendor.gstin || 'GSTIN pending'}</span><span>{vendor.phone || '—'}</span><span>{vendor.email || '—'}</span><span>{vendor.active === false ? 'Inactive' : 'Active'}</span></div>)}</div></section><section className="panel table-panel"><div className="table-header"><div><h2>Purchase orders</h2><span>Downloadable procurement records</span></div></div><div className="data-table">{purchaseOrders.map((order) => <div className="data-row" key={order.id}><span><strong>{order.order_number}</strong><small>{order.status}</small></span><span>{order.vendor_name || 'Vendor'}</span><span>{order.expected_on || 'Unscheduled'}</span><button className="row-more" onClick={() => downloadFile(token, `/api/v1/purchase-orders/${order.id}/download`, `${order.order_number}.csv`).catch((error) => onNotify(error.message))}>Download</button></div>)}</div></section></div>
}

function EditVehicleModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState({ model: vehicle.model, vehicle_type: vehicle.vehicle_type, depot: vehicle.depot, status: vehicle.status, health: vehicle.health, odometer_km: vehicle.odometer_km || 0 })
  return <Modal title={`Edit ${vehicle.reg}`} onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, health: Number(form.health), odometer_km: Number(form.odometer_km) }) }}><input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Model" /><input value={form.vehicle_type} onChange={(event) => setForm({ ...form, vehicle_type: event.target.value })} placeholder="Type" /><input value={form.depot} onChange={(event) => setForm({ ...form, depot: event.target.value })} placeholder="Depot" /><input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} placeholder="Status" /><input type="number" value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value })} placeholder="Health" /><input type="number" value={form.odometer_km} onChange={(event) => setForm({ ...form, odometer_km: event.target.value })} placeholder="Odometer km" /><button className="primary-button" type="submit">Save vehicle</button></form></Modal>
}

function EditComponentModal({ component, onClose, onSave, onServiceComplete }) {
  const [form, setForm] = useState({ name: component.name, component_type: component.component_type, serial_number: component.serial_number || '', last_service_km: component.last_service_km || '', service_interval_km: component.service_interval_km || '', next_service_km: component.next_service_km || '', status: component.status })
  return <Modal title={`Edit ${component.name}`} onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, last_service_km: form.last_service_km ? Number(form.last_service_km) : null, service_interval_km: form.service_interval_km ? Number(form.service_interval_km) : null, next_service_km: form.next_service_km ? Number(form.next_service_km) : null }) }}><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" /><input value={form.component_type} onChange={(event) => setForm({ ...form, component_type: event.target.value })} placeholder="Type" /><input value={form.serial_number} onChange={(event) => setForm({ ...form, serial_number: event.target.value })} placeholder="Serial number" /><input type="number" value={form.last_service_km} onChange={(event) => setForm({ ...form, last_service_km: event.target.value })} placeholder="Last service km" /><input type="number" value={form.service_interval_km} onChange={(event) => setForm({ ...form, service_interval_km: event.target.value })} placeholder="Service interval km" /><input type="number" value={form.next_service_km} onChange={(event) => setForm({ ...form, next_service_km: event.target.value })} placeholder="Next service km" /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Healthy</option><option>Due soon</option><option>In workshop</option><option>Retired</option></select><button className="primary-button" type="submit">Save component</button><button className="secondary-button" type="button" onClick={() => onServiceComplete(Number(form.last_service_km || 0))}>Complete service now</button></form></Modal>
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation"><div className="modal-card"><div className="modal-header"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>
}

function Documents({ documents, vehicles: fleet, onNotify }) {
  return <div><PageHeader eyebrow="Compliance vault" title="Documents" subtitle="Keep every permit, certificate, and policy ready for inspection." action="Upload document" onAction={() => onNotify('Document upload flow is next in the vault module.')} /><div className="document-kpis"><div><span className="kpi-icon green">✓</span><strong>{documents.filter((doc) => doc.status === 'Valid').length}</strong><span>Valid documents</span></div><div><span className="kpi-icon amber">◷</span><strong>{documents.filter((doc) => doc.status !== 'Valid').length}</strong><span>Needs review</span></div><div><span className="kpi-icon red">!</span><strong>0</strong><span>Expired documents</span></div></div><section className="panel table-panel"><div className="table-header"><div><h2>Document register</h2><span>Vehicle and company compliance records</span></div><div className="table-actions"><button className="secondary-button">Document types</button><button className="filter-button">☷ Filters</button></div></div><div className="data-table"><div className="data-row data-head"><span>Document</span><span>Linked to</span><span>Issued by</span><span>Expiry</span><span>Status</span><span></span></div>{documents.map((doc) => <div className="data-row" key={doc.id}><div className="document-cell"><div className="doc-icon neutral">▤</div><div><strong>{doc.name}</strong><small>DOC-{doc.id} · metadata</small></div></div><span>{fleet.find((vehicle) => vehicle.id === doc.vehicle_id)?.reg || 'Organization'}</span><span>{doc.issued_by || 'Not specified'}</span><span>{doc.expires_on}</span><span className="document-status neutral">{doc.status}</span><button className="row-more">•••</button></div>)}</div></section></div>
}

function Costs({ expenses, vehicles: fleet, onNotify }) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount_paise, 0)
  const categoryTotal = (category) => expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount_paise, 0)
  return <div><PageHeader eyebrow="Finance & analytics" title="Costs & finance" subtitle="Understand the true cost of every kilometre, vehicle, and route." action="Record expense" onAction={() => onNotify('Expense form opened.')} /><div className="metric-grid compact"><MetricCard label="Recorded spend" value={`₹${(total / 100000).toFixed(1)}L`} change="live" detail="from expense ledger" icon="₹" tone="navy" /><MetricCard label="Fuel spend" value={`₹${(categoryTotal('Fuel') / 100000).toFixed(1)}L`} change="live" detail="recorded fuel" icon="◉" tone="orange" /><MetricCard label="Maintenance spend" value={`₹${(categoryTotal('Maintenance') / 100000).toFixed(1)}L`} change="live" detail="recorded maintenance" icon="⌁" tone="green" /><MetricCard label="Pending review" value={expenses.filter((expense) => expense.status !== 'Approved').length} change="live" detail="expense records" icon="!" tone="purple" /></div><div className="content-grid"><section className="panel cost-panel"><PanelHeading title="Spend by category" meta="Live expense ledger" action="View ledger" onAction={() => onNotify('Expense ledger opened.')} /><div className="bar-chart">{['Fuel', 'Maintenance', 'Tolls', 'People & admin'].map((category) => { const amount = categoryTotal(category); return <div className="bar-row" key={category}><span>{category}</span><div><i style={{ width: `${total ? Math.max(4, amount / total * 100) : 4}%` }}></i></div><strong>₹{(amount / 100000).toFixed(1)}L</strong></div> })}</div></section><section className="panel"><PanelHeading title="Recent expenses" meta={`${expenses.length} records`} action="See all" onAction={() => onNotify('All expenses opened.')} /><div className="expense-list">{expenses.slice(0, 5).map((expense) => <div className="expense-item" key={expense.id}><div className="expense-icon">₹</div><div><strong>{expense.description}</strong><span>{fleet.find((vehicle) => vehicle.id === expense.vehicle_id)?.reg || expense.vendor || 'Organization'}</span></div><strong>₹{(expense.amount_paise / 100).toLocaleString('en-IN')}</strong></div>)}</div></section></div></div>
}

function AddVehicleModal({ onClose, onSave }) {
  const [form, setForm] = useState({ reg: '', type: '', model: '', depot: '' })
  const [error, setError] = useState('')

  const updateField = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.reg.trim() || !form.type || !form.model.trim() || !form.depot.trim()) {
      setError('Complete all vehicle details before saving.')
      return
    }
    onSave({ reg: form.reg.trim().toUpperCase(), model: form.model.trim(), type: form.type, depot: form.depot.trim(), status: 'Idle / parked', health: 100, km: '0 km', driver: 'Unassigned', accent: 'blue' })
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><div className="modal-header"><div><span className="eyebrow">Fleet register</span><h2>Add a vehicle</h2></div><button type="button" onClick={onClose}>×</button></div><p>Start tracking its documents, components, costs, and maintenance history.</p><div className="form-grid"><label>Registration number<input value={form.reg} onChange={(event) => updateField('reg', event.target.value)} placeholder="e.g. MH 12 AB 1234" /></label><label>Vehicle type<select value={form.type} onChange={(event) => updateField('type', event.target.value)}><option value="" disabled>Select type</option><option>Heavy truck</option><option>Tipper</option><option>Multi-axle</option></select></label><label>Make & model<input value={form.model} onChange={(event) => updateField('model', event.target.value)} placeholder="e.g. Tata Prima 5530" /></label><label>Home depot<input value={form.depot} onChange={(event) => updateField('depot', event.target.value)} placeholder="e.g. Pune Central" /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Add vehicle</button></div></form></div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
