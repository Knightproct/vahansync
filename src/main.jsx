import React, { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { acceptInvitation, approveWorkOrder, changeSubscription, completeComponentService, completeWorkOrder, createComponent, createDocument, createDriverInspection, createDriverIssue, createExpense, createFuelTransaction, createInventoryMovement, createInventoryTransaction, createMaintenancePlan, createPart, createPurchaseOrder, createStockLocation, createSubscriptionCheckout, createTelematicsDevice, createTelematicsIntegration, createTollTransaction, createUser, createVehicle, createInvitation, createVendor, createWorkOrder, dispatchQueuedSms, downloadFile, exportResource, getComponents, getCurrentUser, getDocuments, getDriverInspections, getDriverIssues, getExpenses, getInvitations, getMaintenancePlans, getNotificationDeliveries, getNotificationPreferences, getNotifications, getParts, getPurchaseOrders, getStockLocations, getSubscription, getSubscriptionPlans, getTelematicsDevices, getTelematicsIntegrations, getUsers, getVehicles, getVendors, getWorkOrders, importResource, login, reconcileExpense, resolveNotification, revokeInvitation, signupOrganization, startWorkOrder, syncDueTelematics, updateDocument, updateExpense, updateMyContact, updateNotification, updateNotificationPreference, updatePurchaseOrder, updateUserRole, updateVehicle, updateWorkOrder, uploadDocumentFile } from './api'

const isPublicPage = ['/', '/signup'].includes(window.location.pathname) || window.location.pathname.startsWith('/invite/')

const navItems = [
  { id: 'overview', label: 'Overview', icon: '⌂', permissions: ['fleet', 'maintenance', 'finance', 'compliance'] },
  { id: 'fleet', label: 'Fleet', icon: '▱', permissions: ['fleet'] },
  { id: 'maintenance', label: 'Maintenance', icon: '⌁', permissions: ['maintenance'] },
  { id: 'driver', label: 'Driver checks', icon: '✓', permissions: ['driver'] },
  { id: 'workshop', label: 'Workshop', icon: '⌘', permissions: ['workshop', 'inventory'] },
  { id: 'documents', label: 'Documents', icon: '▤', permissions: ['compliance'] },
  { id: 'costs', label: 'Costs & finance', icon: '₹', permissions: ['finance'] },
  { id: 'settings', label: 'Workspace controls', icon: '⚙', permissions: ['*', 'notifications'] },
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
  const [showSettings, setShowSettings] = useState(false)
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
          <strong>{currentUser?.organization_name || currentUser?.full_name || 'Workspace'}</strong>
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
              {item.id === 'fleet' && <em>{fleet.length}</em>}
              {item.id === 'maintenance' && <em>{workOrders.length}</em>}
              {item.id === 'documents' && <em>{documentsData.length}</em>}
            </button>
          ))}
          <span className="nav-section nav-section-spaced">Workspace</span>
          <button className="nav-item" onClick={() => notify('Reports are being prepared for your workspace.')}>
            <span className="nav-icon">▥</span><span>Reports</span>
          </button>
          {visibleNavItems.some((item) => item.id === 'settings') && <button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => setActive('settings')}>
            <span className="nav-icon">⚙</span><span>Settings</span>
          </button>}
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
          {active === 'maintenance' && <Maintenance role={currentUser?.role} workOrders={workOrders} components={components} plans={maintenancePlans} vehicles={fleet} token={token} onCreated={(workOrder) => setWorkOrders((current) => [workOrder, ...current])} onUpdated={(workOrder) => setWorkOrders((current) => current.map((item) => item.id === workOrder.id ? workOrder : item))} onPlanCreated={(plan) => setMaintenancePlans((current) => [plan, ...current])} onNotify={notify} />}
          {active === 'driver' && <DriverWorkspace token={token} vehicles={fleet} onNotify={notify} />}
          {active === 'workshop' && <Workshop token={token} parts={parts} vendors={vendors} purchaseOrders={purchaseOrders} onVendorCreated={(vendor) => setVendors((current) => [...current, vendor])} onPartCreated={(part) => setParts((current) => [part, ...current])} onNotify={notify} />}
          {active === 'documents' && <Documents token={token} documents={documentsData} vehicles={fleet} onNotify={notify} onDocumentCreated={(document) => setDocumentsData((current) => [document, ...current])} />}
          {active === 'costs' && <Costs token={token} expenses={expenses} vehicles={fleet} onNotify={notify} onExpenseCreated={(expense) => setExpenses((current) => [expense, ...current])} onExpenseUpdated={(expense) => setExpenses((current) => current.map((item) => item.id === expense.id ? expense : item))} />}
          {active === 'settings' && <WorkspaceControls token={token} user={currentUser} subscription={subscription} notifications={notifications} onNotify={notify} onSubscriptionChanged={setSubscription} onNotificationsChanged={setNotifications} />}
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
  const fleetHealth = fleet.length
    ? Math.round(fleet.reduce((sum, vehicle) => sum + vehicle.health, 0) / fleet.length)
    : 0
  const statusCount = (status) => fleet.filter((vehicle) => vehicle.status === status).length
  return <div>
    <PageHeader eyebrow={workspace[0]} title={workspace[1]} subtitle="VahanSync shows the work relevant to your role, with organisation-wide controls behind it." />
    <div className="metric-grid">
      <MetricCard label="Fleet health" value={`${fleetHealth}%`} change="live" detail="average vehicle health" icon="◒" tone="navy" />
      <MetricCard label="Active vehicles" value={`${statusCount('On route')} / ${fleet.length}`} change="live" detail="currently on route" icon="▱" tone="blue" />
      <MetricCard label="Open work orders" value={workOrders.length} change="live" detail="from maintenance planner" icon="⌁" tone="orange" />
      <MetricCard label="Recorded cost" value={`₹${(expenses.reduce((sum, expense) => sum + expense.amount_paise, 0) / 100000).toFixed(1)}L`} change="live" detail="from expense ledger" icon="₹" tone="purple" />
    </div>
    <div className="content-grid">
      {canSeeFleet && <section className="panel fleet-panel">
        <PanelHeading title="Fleet overview" meta={`${fleet.length} vehicles`} action="View all" onAction={() => onNotify('Fleet view selected from the overview.')} />
        <div className="fleet-summary">
          <div className="donut-wrap"><div className="donut"><strong>{fleetHealth}%</strong><span>healthy</span></div></div>
          <div className="legend-list">
            <Legend color="green" label="On route" value={statusCount('On route')} sub={fleet.length ? `${Math.round(statusCount('On route') / fleet.length * 100)}%` : '0%'} />
            <Legend color="orange" label="In workshop" value={statusCount('In workshop')} sub={fleet.length ? `${Math.round(statusCount('In workshop') / fleet.length * 100)}%` : '0%'} />
            <Legend color="blue" label="Idle / parked" value={statusCount('Idle / parked')} sub={fleet.length ? `${Math.round(statusCount('Idle / parked') / fleet.length * 100)}%` : '0%'} />
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
  const [integrations, setIntegrations] = useState([])
  const [integrationForm, setIntegrationForm] = useState({ provider: 'Intangles', base_url: '', sync_path: '/readings', credential_ref: '', sync_interval_minutes: 1440 })
  const [deviceForm, setDeviceForm] = useState({ vehicle_id: rows[0]?.id || '', provider: 'Intangles', device_identifier: '' })
  const [syncing, setSyncing] = useState(false)
  useEffect(() => {
    if (role !== 'fleet_manager' && role !== 'owner') return
    getTelematicsIntegrations(token).then(setIntegrations).catch(() => setIntegrations([]))
  }, [role, token])
  const syncOdometers = async () => {
    setSyncing(true)
    try {
      const results = await syncDueTelematics(token)
      onNotify(results.length ? `GPS sync completed for ${results.length} integration(s). Refreshing fleet readings.` : 'No GPS integration is due for sync.')
      window.location.reload()
    } catch (error) {
      onNotify(error.message)
    } finally {
      setSyncing(false)
    }
  }
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
  const addIntegration = async (event) => { event.preventDefault(); try { const created = await createTelematicsIntegration(token, { ...integrationForm, sync_interval_minutes: Number(integrationForm.sync_interval_minutes) }); setIntegrations((current) => [created, ...current]); onNotify('GPS provider integration saved. Credentials can be added later.') } catch (error) { onNotify(error.message) } }
  const addDevice = async (event) => { event.preventDefault(); try { await createTelematicsDevice(token, { ...deviceForm, vehicle_id: Number(deviceForm.vehicle_id) }); onNotify('GPS device assigned to vehicle.') } catch (error) { onNotify(error.message) } }
  const importVehicles = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const result = await importResource(token, 'vehicles', file); onNotify(`${result.imported} vehicles imported. Reload to view them.`) } catch (error) { onNotify(error.message) } }
  return <div><PageHeader eyebrow="Operations" title="Fleet" subtitle="Every vehicle, every component, one source of truth." action={role === 'fleet_manager' ? 'Add vehicle' : undefined} onAction={onAdd} /><div className="toolbar"><div className="filter-tabs"><button className="selected">Live vehicles <span>{rows.length}</span></button></div><button className="secondary-button" onClick={downloadExport}>Export vehicles ↗</button><label className="secondary-button">Import vehicles<input hidden type="file" accept=".csv" onChange={importVehicles} /></label>{(role === 'fleet_manager' || role === 'owner') && <button className="secondary-button" onClick={syncOdometers} disabled={syncing}>{syncing ? 'Syncing GPS…' : 'Refresh GPS odometers'}</button>}</div>{(role === 'fleet_manager' || role === 'owner') && <section className="panel table-panel"><div className="table-header"><div><h2>Connected GPS providers</h2><span>{integrations.length ? `${integrations.length} integration(s) configured · daily sync when due` : 'Connect Intangles or another provider through the integration API'}</span></div></div><form className="form-grid" onSubmit={addIntegration}><input required placeholder="Provider name" value={integrationForm.provider} onChange={(event) => setIntegrationForm({ ...integrationForm, provider: event.target.value })} /><input required type="url" placeholder="Provider base URL" value={integrationForm.base_url} onChange={(event) => setIntegrationForm({ ...integrationForm, base_url: event.target.value })} /><input placeholder="Sync path" value={integrationForm.sync_path} onChange={(event) => setIntegrationForm({ ...integrationForm, sync_path: event.target.value })} /><input placeholder="Backend credential reference" value={integrationForm.credential_ref} onChange={(event) => setIntegrationForm({ ...integrationForm, credential_ref: event.target.value })} /><button className="primary-button" type="submit">Connect provider</button></form><form className="form-grid" onSubmit={addDevice}><select required value={deviceForm.vehicle_id} onChange={(event) => setDeviceForm({ ...deviceForm, vehicle_id: event.target.value })}>{rows.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input required placeholder="Device provider" value={deviceForm.provider} onChange={(event) => setDeviceForm({ ...deviceForm, provider: event.target.value })} /><input required placeholder="IMEI / device identifier" value={deviceForm.device_identifier} onChange={(event) => setDeviceForm({ ...deviceForm, device_identifier: event.target.value })} /><button className="primary-button" type="submit">Assign GPS device</button></form><div className="data-table">{integrations.map((integration) => <div className="data-row" key={integration.id}><span><strong>{integration.provider}</strong><small>{integration.base_url}</small></span><span>{integration.last_synced_at ? `Last sync ${new Date(integration.last_synced_at).toLocaleString()}` : 'Never synced'}</span><Status status={integration.last_sync_status === 'success' ? 'On route' : 'In workshop'} /><span>{integration.credential_ref ? 'Credential configured' : 'Credential missing'}</span></div>)}</div></section>}<section className="panel table-panel"><div className="table-header"><div><h2>Vehicle register</h2><span>Live organization records</span></div></div><div className="data-table"><div className="data-row data-head"><span>Vehicle</span><span>Depot</span><span>Driver</span><span>Status</span><span>Health</span><span></span></div>{rows.map((v) => <div className="data-row" key={v.reg}><div className="vehicle-cell"><div className={`vehicle-dot ${v.accent}`}></div><div><strong>{v.reg}</strong><small>{v.model} · {v.km}</small></div></div><span>{v.depot}</span><span>{v.driver}</span><Status status={v.status} /><div className="health-cell"><span>{v.health}%</span><div className="health-bar"><i style={{ width: `${v.health}%` }}></i></div>{role === 'fleet_manager' ? <button className="row-more" onClick={() => setEditingVehicle(v)}>Edit</button> : <span />}</div></div>)}</div></section>
    {role === 'fleet_manager' && <section className="panel table-panel"><div className="table-header"><div><h2>Component lifecycle</h2><span>Attach components, monitor odometer service thresholds, and close the maintenance cycle.</span></div></div><form className="form-grid" onSubmit={addComponent}><select value={componentForm.vehicle_id} onChange={(event) => setComponentForm({ ...componentForm, vehicle_id: event.target.value })} required>{rows.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input placeholder="Component name" value={componentForm.name} onChange={(event) => setComponentForm({ ...componentForm, name: event.target.value })} required /><input placeholder="Type (brakes, tyre...)" value={componentForm.component_type} onChange={(event) => setComponentForm({ ...componentForm, component_type: event.target.value })} required /><input type="number" placeholder="Installed odometer km" value={componentForm.installed_at_km} onChange={(event) => setComponentForm({ ...componentForm, installed_at_km: event.target.value })} /><input type="number" placeholder="Service interval km" value={componentForm.service_interval_km} onChange={(event) => setComponentForm({ ...componentForm, service_interval_km: event.target.value })} /><button className="primary-button" type="submit">Attach component</button></form><div className="data-table">{components.map((component) => { const vehicle = rows.find((item) => item.id === component.vehicle_id); const currentKm = vehicle?.odometer_km || 0; const due = component.next_service_km && currentKm >= component.next_service_km; return <div className="data-row" key={component.id}><span>{component.name}<small>{component.component_type}</small></span><span>{vehicle?.reg || 'Vehicle'}</span><span>{currentKm.toLocaleString()} / next {component.next_service_km || '—'} km</span><Status status={due ? 'In workshop' : component.status} /><button className="row-more" onClick={() => setEditingComponent(component)}>Edit</button></div> })}</div></section>}
    {editingVehicle && <EditVehicleModal vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} onSave={async (payload) => { const updated = await updateVehicle(token, editingVehicle.id, payload); onVehicleUpdated(updated); setEditingVehicle(null); onNotify('Vehicle updated.') }} />}
    {editingComponent && <EditComponentModal component={editingComponent} vehicle={rows.find((vehicle) => vehicle.id === editingComponent.vehicle_id)} token={token} onClose={() => setEditingComponent(null)} onSave={async (payload) => { const updated = await updateComponent(token, editingComponent.id, payload); onComponentUpdated(updated); setEditingComponent(null); onNotify('Component lifecycle updated.') }} onServiceComplete={async (odometerKm) => { const updated = await completeComponentService(token, editingComponent.id, odometerKm); onComponentUpdated(updated); setEditingComponent(null); onNotify('Component service completed and next threshold recalculated.') }} />}
  </div>
}

function DriverWorkspace({ token, vehicles, onNotify }) {
  const [inspections, setInspections] = useState([])
  const [issues, setIssues] = useState([])
  const [inspection, setInspection] = useState({ vehicle_id: '', inspection_type: 'pre_trip', status: 'SAFE', odometer_km: '', notes: '' })
  const [issue, setIssue] = useState({ vehicle_id: '', title: '', detail: '', priority: 'Medium' })

  useEffect(() => {
    Promise.all([getDriverInspections(token), getDriverIssues(token)]).then(([loadedInspections, loadedIssues]) => {
      setInspections(loadedInspections)
      setIssues(loadedIssues)
    }).catch((error) => onNotify(error.message))
  }, [token])

  const submitInspection = async (event) => {
    event.preventDefault()
    try {
      const created = await createDriverInspection(token, { ...inspection, vehicle_id: Number(inspection.vehicle_id), odometer_km: Number(inspection.odometer_km) })
      setInspections((current) => [created, ...current])
      setInspection({ ...inspection, status: 'SAFE', odometer_km: '', notes: '' })
      onNotify('Vehicle inspection submitted.')
    } catch (error) { onNotify(error.message) }
  }

  const submitIssue = async (event) => {
    event.preventDefault()
    try {
      const created = await createDriverIssue(token, { ...issue, vehicle_id: Number(issue.vehicle_id) })
      setIssues((current) => [created, ...current])
      setIssue({ ...issue, title: '', detail: '' })
      onNotify('Vehicle issue reported to the fleet manager.')
    } catch (error) { onNotify(error.message) }
  }

  return <div>
    <PageHeader eyebrow="Driver workspace" title="Daily vehicle checks" subtitle="Inspect your assigned vehicle, keep its odometer current, and report defects before they become breakdowns." />
    <section className="panel table-panel">
      <div className="table-header"><div><h2>Submit inspection</h2><span>Unsafe checks immediately mark the vehicle out of service.</span></div></div>
      <form className="form-grid" onSubmit={submitInspection}>
        <select required value={inspection.vehicle_id} onChange={(event) => setInspection({ ...inspection, vehicle_id: event.target.value })}><option value="">Assigned vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg} · {vehicle.odometer_km || 0} km</option>)}</select>
        <select value={inspection.inspection_type} onChange={(event) => setInspection({ ...inspection, inspection_type: event.target.value })}><option value="pre_trip">Pre-trip</option><option value="post_trip">Post-trip</option></select>
        <select value={inspection.status} onChange={(event) => setInspection({ ...inspection, status: event.target.value })}><option value="SAFE">Safe</option><option value="REVIEW">Needs review</option><option value="UNSAFE">Unsafe</option></select>
        <input required type="number" min="0" placeholder="Current odometer km" value={inspection.odometer_km} onChange={(event) => setInspection({ ...inspection, odometer_km: event.target.value })} />
        <input placeholder="Notes" value={inspection.notes} onChange={(event) => setInspection({ ...inspection, notes: event.target.value })} />
        <button className="primary-button" type="submit">Submit check</button>
      </form>
    </section>
    <section className="panel table-panel">
      <div className="table-header"><div><h2>Report a vehicle issue</h2><span>Issues become traceable maintenance work for the fleet team.</span></div></div>
      <form className="form-grid" onSubmit={submitIssue}>
        <select required value={issue.vehicle_id} onChange={(event) => setIssue({ ...issue, vehicle_id: event.target.value })}><option value="">Assigned vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select>
        <input required placeholder="Issue title" value={issue.title} onChange={(event) => setIssue({ ...issue, title: event.target.value })} />
        <input required placeholder="Describe the defect" value={issue.detail} onChange={(event) => setIssue({ ...issue, detail: event.target.value })} />
        <select value={issue.priority} onChange={(event) => setIssue({ ...issue, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
        <button className="primary-button" type="submit">Report issue</button>
      </form>
    </section>
    <div className="metric-grid compact">
      <MetricCard label="Assigned vehicles" value={vehicles.length} change="live" detail="visible to you" icon="▱" tone="blue" />
      <MetricCard label="Checks submitted" value={inspections.length} change="history" detail="pre-trip and post-trip" icon="✓" tone="green" />
      <MetricCard label="Open issues" value={issues.filter((item) => item.status === 'OPEN').length} change="attention" detail="reported defects" icon="!" tone="orange" />
    </div>
    <section className="panel table-panel">
      <div className="table-header"><div><h2>Recent checks and issues</h2><span>Only records created by your driver account are shown.</span></div></div>
      <div className="data-table">
        {[...inspections.map((item) => ({ ...item, kind: 'Inspection', label: item.inspection_type, status: item.status })), ...issues.map((item) => ({ ...item, kind: 'Issue', label: item.title }))].slice(0, 20).map((item) => <div className="data-row" key={`${item.kind}-${item.id}`}><span><strong>{item.kind}</strong><small>{item.label}</small></span><span>{vehicles.find((vehicle) => vehicle.id === item.vehicle_id)?.reg || 'Vehicle'}</span><span>{item.odometer_km ? `${item.odometer_km.toLocaleString()} km` : item.priority}</span><Status status={item.status} /><span>{new Date(item.created_at).toLocaleString()}</span></div>)}
      </div>
    </section>
  </div>
}

function Maintenance({ role, workOrders, components, plans, vehicles: fleet, token, onCreated, onUpdated, onPlanCreated, onNotify }) {
  const [order, setOrder] = useState({ vehicle_id: '', title: '', description: '', priority: 'Medium', status: 'Open', due_date: '', assigned_to: '' })
  const [plan, setPlan] = useState({ vehicle_id: '', name: '', interval_km: '', interval_days: '', next_due_km: '', next_due_on: '' })
  const submitOrder = async (event) => { event.preventDefault(); try { const created = await createWorkOrder(token, { ...order, vehicle_id: Number(order.vehicle_id), description: order.description || null, due_date: order.due_date || null, assigned_to: order.assigned_to || null }); onCreated(created); setOrder({ ...order, title: '', description: '' }); onNotify('Work order created.') } catch (error) { onNotify(error.message) } }
  const submitPlan = async (event) => { event.preventDefault(); try { const created = await createMaintenancePlan(token, { ...plan, vehicle_id: Number(plan.vehicle_id), interval_km: plan.interval_km ? Number(plan.interval_km) : null, interval_days: plan.interval_days ? Number(plan.interval_days) : null, next_due_km: plan.next_due_km ? Number(plan.next_due_km) : null, next_due_on: plan.next_due_on || null }); onPlanCreated(created); onNotify('Maintenance plan created.') } catch (error) { onNotify(error.message) } }
  const download = (id) => { downloadFile(token, `/api/v1/work-orders/${id}/download`, `WO-${id}.html`).catch((error) => onNotify(error.message)) }
  const transition = async (item) => {
    try {
      const action = item.status === 'Open' || item.status === 'Assigned' ? startWorkOrder : item.status === 'In progress' ? completeWorkOrder : approveWorkOrder
      const updated = await action(token, item.id)
      onUpdated(updated)
      onNotify(`Work order ${updated.status.toLowerCase()}.`)
    } catch (error) { onNotify(error.message) }
  }
  return <div>
    <PageHeader eyebrow="Workshop control" title="Maintenance" subtitle="Plan preventive care and close every work order on time." />
    <section className="panel table-panel"><div className="table-header"><div><h2>Create work order</h2><span>Driver defects and fleet priorities enter the planner here.</span></div></div><form className="form-grid" onSubmit={submitOrder}><select required value={order.vehicle_id} onChange={(event) => setOrder({ ...order, vehicle_id: event.target.value })}><option value="">Vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input required placeholder="Title" value={order.title} onChange={(event) => setOrder({ ...order, title: event.target.value })} /><input placeholder="Description" value={order.description} onChange={(event) => setOrder({ ...order, description: event.target.value })} /><select value={order.priority} onChange={(event) => setOrder({ ...order, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select><input type="date" value={order.due_date} onChange={(event) => setOrder({ ...order, due_date: event.target.value })} /><input placeholder="Assigned technician" value={order.assigned_to} onChange={(event) => setOrder({ ...order, assigned_to: event.target.value })} /><button className="primary-button" type="submit">Create work order</button></form></section>
    <section className="panel table-panel"><div className="table-header"><div><h2>Preventive maintenance plan</h2><span>Use odometer or calendar thresholds.</span></div></div><form className="form-grid" onSubmit={submitPlan}><select required value={plan.vehicle_id} onChange={(event) => setPlan({ ...plan, vehicle_id: event.target.value })}><option value="">Vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input required placeholder="Plan name" value={plan.name} onChange={(event) => setPlan({ ...plan, name: event.target.value })} /><input type="number" placeholder="Interval km" value={plan.interval_km} onChange={(event) => setPlan({ ...plan, interval_km: event.target.value })} /><input type="number" placeholder="Interval days" value={plan.interval_days} onChange={(event) => setPlan({ ...plan, interval_days: event.target.value })} /><input type="number" placeholder="Next due km" value={plan.next_due_km} onChange={(event) => setPlan({ ...plan, next_due_km: event.target.value })} /><input type="date" value={plan.next_due_on} onChange={(event) => setPlan({ ...plan, next_due_on: event.target.value })} /><button className="primary-button" type="submit">Create plan</button></form></section>
    <div className="metric-grid compact"><MetricCard label="Open work orders" value={workOrders.length} change="live" detail="assigned records" icon="◷" tone="orange" /><MetricCard label="In progress" value={workOrders.filter((item) => item.status === 'In progress').length} change="live" detail="active jobs" icon="⌁" tone="blue" /><MetricCard label="Tracked components" value={components.length} change="live" detail={`${plans.length} service plans`} icon="◒" tone="green" /><MetricCard label="Preventive compliance" value="Live" change="odometer" detail="component thresholds" icon="✓" tone="purple" /></div>
    <section className="panel table-panel"><div className="table-header"><div><h2>Work order planner</h2><span>{role === 'technician' ? 'Your assigned jobs' : 'All active and scheduled jobs'}</span></div></div><div className="data-table"><div className="data-row data-head"><span>Work order</span><span>Vehicle</span><span>Assigned to</span><span>Due</span><span>Priority</span><span>Status</span><span></span></div>{workOrders.map((item) => <div className="data-row" key={item.id}><div className="workorder-cell"><div className="maintenance-icon small amber">⌁</div><div><strong>{item.title}</strong><small>WO-{item.id}</small></div></div><span>{fleet.find((vehicle) => vehicle.id === item.vehicle_id)?.reg || 'Vehicle linked'}</span><span>{item.assigned_to || 'Assigned technician'}</span><span>{item.due_date || 'Unscheduled'}</span><span className={`priority ${item.priority === 'High' ? 'red' : item.priority === 'Low' ? 'green' : 'amber'}`}>{item.priority}</span><Status status={item.status} />{['Open', 'Assigned', 'In progress', 'Ready for review'].includes(item.status) && <button className="row-more" onClick={() => transition(item)}>{item.status === 'Open' || item.status === 'Assigned' ? 'Start' : item.status === 'In progress' ? 'Complete' : 'Approve'}</button>}<button className="row-more" onClick={() => download(item.id)}>Download</button></div>)}</div></section>
  </div>
}

function Workshop({ token, parts, vendors, purchaseOrders, onVendorCreated, onPartCreated, onNotify }) {
  const submittedOrders = purchaseOrders.filter((order) => ['Submitted', 'Approved', 'Partially received'].includes(order.status))
  const [vendorForm, setVendorForm] = useState({ name: '', vendor_type: 'Parts supplier', gstin: '', phone: '', email: '' })
  const [partForm, setPartForm] = useState({ sku: '', name: '', category: 'General', quantity_on_hand: 0, reorder_level: 0, unit_cost_paise: 0, supplier: '' })
  const [stockForm, setStockForm] = useState({ part_id: '', transaction_type: 'receipt', quantity: '', reference: '' })
  const [locationForm, setLocationForm] = useState({ name: '', code: '', address: '' })
  const [orderForm, setOrderForm] = useState({ vendor_id: '', part_id: '', quantity: '', unit_cost_paise: '', expected_on: '', notes: '' })
  const addVendor = async (event) => {
    event.preventDefault()
    try {
      const vendor = await createVendor(token, vendorForm)
      onVendorCreated(vendor)
      setVendorForm({ name: '', vendor_type: 'Parts supplier', gstin: '', phone: '', email: '' })
      onNotify('Vendor added.')
    } catch (error) { onNotify(error.message) }
  }
  const addPart = async (event) => { event.preventDefault(); try { const part = await createPart(token, { ...partForm, quantity_on_hand: Number(partForm.quantity_on_hand), reorder_level: Number(partForm.reorder_level), unit_cost_paise: Number(partForm.unit_cost_paise) }); onPartCreated(part); onNotify('Part added to catalogue.') } catch (error) { onNotify(error.message) } }
  const transact = async (event) => { event.preventDefault(); try { await createInventoryTransaction(token, { ...stockForm, part_id: Number(stockForm.part_id), quantity: Number(stockForm.quantity) }); onNotify('Stock transaction recorded.') } catch (error) { onNotify(error.message) } }
  const addLocation = async (event) => { event.preventDefault(); try { await createStockLocation(token, locationForm); setLocationForm({ name: '', code: '', address: '' }); onNotify('Stock location created.') } catch (error) { onNotify(error.message) } }
  const addOrder = async (event) => { event.preventDefault(); try { await createPurchaseOrder(token, { vendor_id: Number(orderForm.vendor_id), expected_on: orderForm.expected_on || null, notes: orderForm.notes, lines: [{ part_id: Number(orderForm.part_id), quantity: Number(orderForm.quantity), unit_cost_paise: Number(orderForm.unit_cost_paise) }] }); onNotify('Purchase order created.') } catch (error) { onNotify(error.message) } }
  const importParts = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const result = await importResource(token, 'parts', file); onNotify(`${result.imported} parts imported.`) } catch (error) { onNotify(error.message) } }
  return <div><PageHeader eyebrow="Workshop & inventory" title="Workshop inventory" subtitle="Know what is on the shelf, what is moving, and what needs ordering." /><div className="inventory-banner"><div className="inventory-stat"><span className="inventory-number">₹{(parts.reduce((total, part) => total + part.quantity_on_hand * part.unit_cost_paise, 0) / 100000).toFixed(1)}L</span><span>Total inventory value</span></div><div className="inventory-stat"><span className="inventory-number">{parts.reduce((total, part) => total + part.quantity_on_hand, 0)}</span><span>Parts in stock</span></div><div className="inventory-stat alert"><span className="inventory-number">{parts.filter((part) => part.quantity_on_hand <= part.reorder_level).length.toString().padStart(2, '0')}</span><span>Below reorder point</span></div><span>{submittedOrders.length} active purchase orders</span></div><section className="panel table-panel"><div className="table-header"><div><h2>Parts and stock</h2><span>{purchaseOrders.length} purchase orders · {vendors.length} vendors</span></div><div className="table-actions"><button className="filter-button" onClick={() => exportResource(token, 'parts').then((blob) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'parts.csv'; link.click(); URL.revokeObjectURL(url) })}>Export parts</button><label className="filter-button">Import parts<input hidden type="file" accept=".csv" onChange={importParts} /></label></div></div><form className="form-grid" onSubmit={addPart}><input required placeholder="SKU" value={partForm.sku} onChange={(event) => setPartForm({ ...partForm, sku: event.target.value })} /><input required placeholder="Part name" value={partForm.name} onChange={(event) => setPartForm({ ...partForm, name: event.target.value })} /><input required placeholder="Category" value={partForm.category} onChange={(event) => setPartForm({ ...partForm, category: event.target.value })} /><input type="number" placeholder="Opening quantity" value={partForm.quantity_on_hand} onChange={(event) => setPartForm({ ...partForm, quantity_on_hand: event.target.value })} /><input type="number" placeholder="Reorder level" value={partForm.reorder_level} onChange={(event) => setPartForm({ ...partForm, reorder_level: event.target.value })} /><input type="number" placeholder="Unit cost paise" value={partForm.unit_cost_paise} onChange={(event) => setPartForm({ ...partForm, unit_cost_paise: event.target.value })} /><button className="primary-button" type="submit">Add part</button></form><form className="form-grid" onSubmit={transact}><select required value={stockForm.part_id} onChange={(event) => setStockForm({ ...stockForm, part_id: event.target.value })}><option value="">Part</option>{parts.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}</select><select value={stockForm.transaction_type} onChange={(event) => setStockForm({ ...stockForm, transaction_type: event.target.value })}><option value="receipt">Receipt</option><option value="issue">Issue</option><option value="adjustment">Adjustment</option></select><input required type="number" placeholder="Quantity" value={stockForm.quantity} onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })} /><input placeholder="Reference / work order" value={stockForm.reference} onChange={(event) => setStockForm({ ...stockForm, reference: event.target.value })} /><button className="primary-button" type="submit">Post stock transaction</button></form><div className="data-table inventory-table"><div className="data-row data-head"><span>Part</span><span>Category</span><span>In stock</span><span>Unit cost</span><span>Supplier</span><span></span></div>{parts.map((part) => <div className="data-row" key={part.sku}><div className="part-cell"><div className="part-icon">▦</div><div><strong>{part.name}</strong><small>{part.sku}</small></div></div><span>{part.category}</span><span><strong className={part.quantity_on_hand <= part.reorder_level ? 'low-stock' : ''}>{part.quantity_on_hand}</strong> <small>/ min {part.reorder_level}</small></span><span>₹{(part.unit_cost_paise / 100).toLocaleString('en-IN')}</span><span>{part.supplier || 'Unassigned'}</span><span /></div>)}</div></section><section className="panel table-panel"><div className="table-header"><div><h2>Vendor management</h2><span>Active suppliers connected to procurement</span></div></div><form className="form-grid" onSubmit={addVendor}><input placeholder="Vendor name" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} required /><input placeholder="Vendor type" value={vendorForm.vendor_type} onChange={(event) => setVendorForm({ ...vendorForm, vendor_type: event.target.value })} /><input placeholder="GSTIN" value={vendorForm.gstin} onChange={(event) => setVendorForm({ ...vendorForm, gstin: event.target.value })} /><input placeholder="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} /><input placeholder="Email" value={vendorForm.email} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} /><button className="primary-button" type="submit">Add vendor</button></form><div className="data-table">{vendors.map((vendor) => <div className="data-row" key={vendor.id}><span><strong>{vendor.name}</strong><small>{vendor.vendor_type}</small></span><span>{vendor.gstin || 'GSTIN pending'}</span><span>{vendor.phone || '—'}</span><span>{vendor.email || '—'}</span><span>{vendor.active === false ? 'Inactive' : 'Active'}</span></div>)}</div></section><section className="panel table-panel"><div className="table-header"><div><h2>Purchase orders</h2><span>Downloadable procurement records</span></div></div><form className="form-grid" onSubmit={addOrder}><select required value={orderForm.vendor_id} onChange={(event) => setOrderForm({ ...orderForm, vendor_id: event.target.value })}><option value="">Vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select><select required value={orderForm.part_id} onChange={(event) => setOrderForm({ ...orderForm, part_id: event.target.value })}><option value="">Part</option>{parts.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}</select><input required type="number" placeholder="Quantity" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /><input required type="number" placeholder="Unit cost paise" value={orderForm.unit_cost_paise} onChange={(event) => setOrderForm({ ...orderForm, unit_cost_paise: event.target.value })} /><input type="date" value={orderForm.expected_on} onChange={(event) => setOrderForm({ ...orderForm, expected_on: event.target.value })} /><button className="primary-button" type="submit">Create purchase order</button></form><div className="data-table">{purchaseOrders.map((order) => <div className="data-row" key={order.id}><span><strong>{order.order_number}</strong><small>{order.status}</small></span><span>{order.vendor_name || 'Vendor'}</span><span>{order.expected_on || 'Unscheduled'}</span><select value={order.status} onChange={async (event) => { try { await updatePurchaseOrder(token, order.id, event.target.value); onNotify('Purchase order status updated.') } catch (error) { onNotify(error.message) } }}><option>Draft</option><option>Submitted</option><option>Approved</option><option>Partially received</option><option>Received</option><option>Cancelled</option></select><button className="row-more" onClick={() => downloadFile(token, `/api/v1/purchase-orders/${order.id}/download`, `${order.order_number}.csv`).catch((error) => onNotify(error.message))}>Download</button></div>)}</div></section><section className="panel table-panel"><div className="table-header"><div><h2>Stock locations</h2><span>Track workshop and depot storage locations.</span></div></div><form className="form-grid" onSubmit={addLocation}><input required placeholder="Location name" value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} /><input required placeholder="Code" value={locationForm.code} onChange={(event) => setLocationForm({ ...locationForm, code: event.target.value })} /><input placeholder="Address" value={locationForm.address} onChange={(event) => setLocationForm({ ...locationForm, address: event.target.value })} /><button className="primary-button" type="submit">Add location</button></form></section></div>
}

function EditVehicleModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState({ model: vehicle.model, vehicle_type: vehicle.vehicle_type, depot: vehicle.depot, status: vehicle.status, health: vehicle.health, odometer_km: vehicle.odometer_km || 0 })
  return <Modal title={`Edit ${vehicle.reg}`} onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, health: Number(form.health), odometer_km: Number(form.odometer_km) }) }}><input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Model" /><input value={form.vehicle_type} onChange={(event) => setForm({ ...form, vehicle_type: event.target.value })} placeholder="Type" /><input value={form.depot} onChange={(event) => setForm({ ...form, depot: event.target.value })} placeholder="Depot" /><input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} placeholder="Status" /><input type="number" value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value })} placeholder="Health" /><input type="number" value={form.odometer_km} onChange={(event) => setForm({ ...form, odometer_km: event.target.value })} placeholder="Odometer km" /><button className="primary-button" type="submit">Save vehicle</button></form></Modal>
}

function EditComponentModal({ component, vehicle, onClose, onSave, onServiceComplete }) {
  const [form, setForm] = useState({ name: component.name, component_type: component.component_type, serial_number: component.serial_number || '', last_service_km: component.last_service_km || '', service_interval_km: component.service_interval_km || '', next_service_km: component.next_service_km || '', status: component.status })
  return <Modal title={`Edit ${component.name}`} onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, last_service_km: form.last_service_km ? Number(form.last_service_km) : null, service_interval_km: form.service_interval_km ? Number(form.service_interval_km) : null, next_service_km: form.next_service_km ? Number(form.next_service_km) : null }) }}><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" /><input value={form.component_type} onChange={(event) => setForm({ ...form, component_type: event.target.value })} placeholder="Type" /><input value={form.serial_number} onChange={(event) => setForm({ ...form, serial_number: event.target.value })} placeholder="Serial number" /><input type="number" value={form.last_service_km} onChange={(event) => setForm({ ...form, last_service_km: event.target.value })} placeholder="Last service km" /><input type="number" value={form.service_interval_km} onChange={(event) => setForm({ ...form, service_interval_km: event.target.value })} placeholder="Service interval km" /><input type="number" value={form.next_service_km} onChange={(event) => setForm({ ...form, next_service_km: event.target.value })} placeholder="Next service km" /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Healthy</option><option>Due soon</option><option>In workshop</option><option>Retired</option></select><button className="primary-button" type="submit">Save component</button><button className="secondary-button" type="button" onClick={() => onServiceComplete(vehicle?.odometer_km || component.last_service_km || component.installed_at_km || 0)}>Complete service at current odometer</button></form></Modal>
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation"><div className="modal-card"><div className="modal-header"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>
}

function Documents({ token, documents, vehicles: fleet, onNotify, onDocumentCreated }) {
  const [form, setForm] = useState({ name: '', document_type: 'Insurance', vehicle_id: '', issued_by: '', expires_on: '', status: 'Valid' })
  const [file, setFile] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    try {
      const created = await createDocument(token, { ...form, vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null })
      if (file) await uploadDocumentFile(token, created.id, file)
      onDocumentCreated(created)
      setForm({ name: '', document_type: 'Insurance', vehicle_id: '', issued_by: '', expires_on: '', status: 'Valid' })
      setFile(null)
      onNotify('Document saved to the compliance vault.')
    } catch (error) { onNotify(error.message) }
  }
  return <div><PageHeader eyebrow="Compliance vault" title="Documents" subtitle="Keep every permit, certificate, and policy ready for inspection." /><section className="panel table-panel"><div className="table-header"><div><h2>Add compliance document</h2><span>Metadata and private file upload are stored against the organization.</span></div></div><form className="form-grid" onSubmit={submit}><input required placeholder="Document name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input required placeholder="Document type" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} /><select value={form.vehicle_id} onChange={(event) => setForm({ ...form, vehicle_id: event.target.value })}><option value="">Organization document</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input placeholder="Issued by" value={form.issued_by} onChange={(event) => setForm({ ...form, issued_by: event.target.value })} /><input required type="date" value={form.expires_on} onChange={(event) => setForm({ ...form, expires_on: event.target.value })} /><input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button className="primary-button" type="submit">Save document</button></form></section><div className="document-kpis"><div><span className="kpi-icon green">✓</span><strong>{documents.filter((doc) => doc.status === 'Valid').length}</strong><span>Valid documents</span></div><div><span className="kpi-icon amber">◷</span><strong>{documents.filter((doc) => doc.status !== 'Valid' && doc.status !== 'Expired').length}</strong><span>Needs review</span></div><div><span className="kpi-icon red">!</span><strong>{documents.filter((doc) => doc.status === 'Expired').length}</strong><span>Expired documents</span></div></div><section className="panel table-panel"><div className="table-header"><div><h2>Document register</h2><span>Vehicle and company compliance records</span></div></div><div className="data-table"><div className="data-row data-head"><span>Document</span><span>Linked to</span><span>Issued by</span><span>Expiry</span><span>Status</span><span></span></div>{documents.map((doc) => <div className="data-row" key={doc.id}><div className="document-cell"><div className="doc-icon neutral">▤</div><div><strong>{doc.name}</strong><small>DOC-{doc.id} · metadata</small></div></div><span>{fleet.find((vehicle) => vehicle.id === doc.vehicle_id)?.reg || 'Organization'}</span><span>{doc.issued_by || 'Not specified'}</span><span>{doc.expires_on}</span><select value={doc.status} onChange={async (event) => { try { await updateDocument(token, doc.id, { status: event.target.value }); onNotify('Document status updated.') } catch (error) { onNotify(error.message) } }}><option>Valid</option><option>Needs review</option><option>Expired</option></select><button className="row-more" onClick={() => downloadFile(token, `/api/v1/documents/${doc.id}/file`, `${doc.name}.file`).catch((error) => onNotify(error.message))}>Download</button></div>)}</div></section></div>
}

function WorkspaceControls({ token, user, subscription, notifications, onNotify, onSubscriptionChanged, onNotificationsChanged }) {
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [preferences, setPreferences] = useState([])
  const [plans, setPlans] = useState([])
  const [mobile, setMobile] = useState(user?.mobile_phone || '')
  const [invite, setInvite] = useState({ email: '', full_name: '', mobile_phone: '', role: 'fleet_manager', expires_in_days: 7 })
  const [directUser, setDirectUser] = useState({ email: '', full_name: '', mobile_phone: '', password: '', role: 'fleet_manager' })

  useEffect(() => {
    Promise.all([getUsers(token), getInvitations(token), getNotificationDeliveries(token), getNotificationPreferences(token), getSubscriptionPlans(token)])
      .then(([loadedUsers, loadedInvitations, loadedDeliveries, loadedPreferences, loadedPlans]) => {
        setUsers(loadedUsers)
        setInvitations(loadedInvitations)
        setDeliveries(loadedDeliveries)
        setPreferences(loadedPreferences)
        setPlans(loadedPlans)
      })
      .catch((error) => onNotify(error.message))
  }, [token, onNotify])

  const savePreference = async (preference) => {
    try {
      const saved = await updateNotificationPreference(token, preference)
      setPreferences((current) => [...current.filter((item) => item.notification_type !== saved.notification_type), saved])
      onNotify('Notification preference saved.')
    } catch (error) { onNotify(error.message) }
  }
  const saveContact = async (event) => {
    event.preventDefault()
    try {
      await updateMyContact(token, mobile || null)
      onNotify('Mobile number updated.')
    } catch (error) { onNotify(error.message) }
  }
  const sendInvite = async (event) => {
    event.preventDefault()
    try {
      const created = await createInvitation(token, invite)
      setInvitations((current) => [created, ...current])
      setInvite({ email: '', full_name: '', mobile_phone: '', role: 'fleet_manager', expires_in_days: 7 })
      onNotify(`Invitation created for ${created.email}.`)
    } catch (error) { onNotify(error.message) }
  }
  const createMember = async (event) => {
    event.preventDefault()
    try {
      const created = await createUser(token, { ...directUser })
      setUsers((current) => [created, ...current])
      setDirectUser({ email: '', full_name: '', mobile_phone: '', password: '', role: 'fleet_manager' })
      onNotify(`User ${created.email} created.`)
    } catch (error) { onNotify(error.message) }
  }
  const refreshDeliveries = async () => {
    try {
      const result = await dispatchQueuedSms(token)
      setDeliveries(await getNotificationDeliveries(token))
      onNotify(`${result.processed} queued SMS deliveries processed.`)
    } catch (error) { onNotify(error.message) }
  }

  return <div>
    <PageHeader eyebrow="Workspace controls" title="Governance & delivery" subtitle="Manage members, subscription, notification channels, and operational access." />
    {user?.role === 'owner' && <section className="panel table-panel">
      <div className="table-header"><div><h2>Team members</h2><span>{users.length} members in this organization</span></div></div>
      <div className="data-table"><div className="data-row data-head"><span>Member</span><span>Role</span><span>Mobile</span><span></span></div>
        {users.map((member) => <div className="data-row" key={member.id}><span><strong>{member.full_name}</strong><small>{member.email}</small></span><select value={member.role} disabled={member.role === 'owner'} onChange={async (event) => { try { const updated = await updateUserRole(token, member.id, event.target.value); setUsers((current) => current.map((item) => item.id === updated.id ? updated : item)); onNotify('Role updated.') } catch (error) { onNotify(error.message) } }}><option value="fleet_manager">Fleet manager</option><option value="inventory_manager">Inventory manager</option><option value="driver">Driver</option><option value="technician">Mechanic / technician</option><option value="accountant">Accountant</option>{member.role === 'owner' && <option value="owner">Owner</option>}</select><span>{member.mobile_phone || 'Not added'}</span><span /></div>)}
      </div>
    </section>}
    {user?.role === 'owner' && <section className="panel table-panel">
      <div className="table-header"><div><h2>Invite teammates</h2><span>Invite by role; access remains server-authorized.</span></div></div>
      <form className="form-grid" onSubmit={sendInvite}><input required type="email" placeholder="Email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /><input required placeholder="Full name" value={invite.full_name} onChange={(event) => setInvite({ ...invite, full_name: event.target.value })} /><input placeholder="Mobile phone" value={invite.mobile_phone} onChange={(event) => setInvite({ ...invite, mobile_phone: event.target.value })} /><select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}><option value="fleet_manager">Fleet manager</option><option value="inventory_manager">Inventory manager</option><option value="driver">Driver</option><option value="technician">Mechanic / technician</option><option value="accountant">Accountant</option></select><button className="primary-button" type="submit">Create invitation</button></form>
      <form className="form-grid" onSubmit={createMember}><input required type="email" placeholder="Create user email" value={directUser.email} onChange={(event) => setDirectUser({ ...directUser, email: event.target.value })} /><input required placeholder="Full name" value={directUser.full_name} onChange={(event) => setDirectUser({ ...directUser, full_name: event.target.value })} /><input required type="password" placeholder="Temporary password" value={directUser.password} onChange={(event) => setDirectUser({ ...directUser, password: event.target.value })} /><select value={directUser.role} onChange={(event) => setDirectUser({ ...directUser, role: event.target.value })}><option value="fleet_manager">Fleet manager</option><option value="inventory_manager">Inventory manager</option><option value="driver">Driver</option><option value="technician">Mechanic / technician</option><option value="accountant">Accountant</option></select><button className="secondary-button" type="submit">Create user directly</button></form>
      <div className="data-table">{invitations.map((item) => <div className="data-row" key={item.id}><span><strong>{item.full_name}</strong><small>{item.email}</small></span><span>{item.role}</span><span>{item.revoked_at ? 'Revoked' : item.accepted_at ? 'Accepted' : `Expires ${item.expires_at}`}</span>{!item.revoked_at && !item.accepted_at ? <button className="row-more" onClick={async () => { try { await revokeInvitation(token, item.id); setInvitations((current) => current.map((entry) => entry.id === item.id ? { ...entry, revoked_at: new Date().toISOString() } : entry)); onNotify('Invitation revoked.') } catch (error) { onNotify(error.message) } }}>Revoke</button> : <span />}</div>)}</div>
    </section>}
    <section className="panel table-panel">
      <div className="table-header"><div><h2>Subscription</h2><span>{subscription?.plan?.name} · {subscription?.status}</span></div></div>
      <div className="form-grid">{plans.map((plan) => <button type="button" className={`secondary-button ${subscription?.plan?.code === plan.code ? 'selected' : ''}`} key={plan.code} disabled={user?.role !== 'owner'} onClick={async () => { try { const changed = await changeSubscription(token, plan.code); onSubscriptionChanged(changed); onNotify(`Subscription changed to ${plan.name}.`) } catch (error) { onNotify(error.message) } }}>{plan.name} · {plan.monthly_price_paise ? `₹${(plan.monthly_price_paise / 100).toLocaleString('en-IN')}/month` : 'Custom'}</button>)}<button type="button" className="primary-button" disabled={user?.role !== 'owner'} onClick={async () => { try { const checkout = await createSubscriptionCheckout(token, subscription?.plan?.code || 'starter'); if (checkout.short_url) window.open(checkout.short_url, '_blank', 'noopener,noreferrer'); else onNotify('Razorpay checkout is ready when credentials are configured.') } catch (error) { onNotify(error.message) } }}>Open Razorpay checkout</button></div>
    </section>
    <section className="panel table-panel">
      <div className="table-header"><div><h2>Mobile alerts</h2><span>SMS stays queued until provider credentials are configured.</span></div><button className="secondary-button" onClick={refreshDeliveries}>Retry queued SMS</button></div>
      <form className="form-grid" onSubmit={saveContact}><input placeholder="+91 mobile number" value={mobile} onChange={(event) => setMobile(event.target.value)} /><button className="primary-button" type="submit">Save mobile</button></form>
      <div className="form-grid">{['document_expiry', 'stock_reorder'].map((type) => { const current = preferences.find((item) => item.notification_type === type) || { notification_type: type, in_app: true, email: false, sms: true, whatsapp: false, push: false }; return <label key={type}>{type.replace('_', ' ')}<select value={current.sms ? 'sms' : 'in_app'} onChange={(event) => savePreference({ ...current, sms: event.target.value === 'sms' })}><option value="in_app">In-app only</option><option value="sms">In-app + SMS</option></select></label> })}</div>
      <div className="data-table">{deliveries.slice(0, 12).map((item) => <div className="data-row" key={item.id}><span>Delivery #{item.id}</span><span>{item.channel}</span><span>{item.status}</span><span>{item.sent_at || 'Queued'}</span></div>)}</div>
    </section>
    <section className="panel table-panel"><div className="table-header"><div><h2>Notifications</h2><span>{notifications.filter((item) => item.status === 'unread').length} unread</span></div></div><div className="data-table">{notifications.slice(0, 12).map((item) => <div className="data-row" key={item.id}><span><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.severity}</span><span>{item.status}</span>{item.status === 'unread' && <button className="row-more" onClick={async () => { try { const updated = await updateNotification(token, item.id, 'read'); onNotificationsChanged((current) => current.map((entry) => entry.id === updated.id ? updated : entry)) } catch (error) { onNotify(error.message) } }}>Mark read</button>}{item.status !== 'resolved' && <button className="row-more" onClick={async () => { try { const updated = await resolveNotification(token, item.id); onNotificationsChanged((current) => current.map((entry) => entry.id === updated.id ? updated : entry)) } catch (error) { onNotify(error.message) } }}>Resolve</button>}</div>)}</div></section>
  </div>
}

function Costs({ token, expenses, vehicles: fleet, onNotify, onExpenseCreated, onExpenseUpdated }) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount_paise, 0)
  const categoryTotal = (category) => expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount_paise, 0)
  const [expense, setExpense] = useState({ category: 'Maintenance', description: '', amount_paise: '', gst_amount_paise: 0, incurred_on: new Date().toISOString().slice(0, 10), vehicle_id: '', vendor: '', status: 'Pending' })
  const [fuel, setFuel] = useState({ vehicle_id: '', station: '', fuel_type: 'Diesel', litres_milli: '', price_per_litre_paise: '', odometer_km: '', incurred_on: new Date().toISOString().slice(0, 10) })
  const [toll, setToll] = useState({ vehicle_id: '', toll_operator: '', plaza: '', amount_paise: '', incurred_on: new Date().toISOString().slice(0, 10) })
  const submit = async (event) => { event.preventDefault(); try { const created = await createExpense(token, { ...expense, amount_paise: Number(expense.amount_paise), gst_amount_paise: Number(expense.gst_amount_paise), vehicle_id: expense.vehicle_id ? Number(expense.vehicle_id) : null }); onExpenseCreated(created); onNotify('Expense recorded.'); setExpense({ ...expense, description: '', amount_paise: '' }) } catch (error) { onNotify(error.message) } }
  const submitFuel = async (event) => { event.preventDefault(); try { await createFuelTransaction(token, { ...fuel, vehicle_id: Number(fuel.vehicle_id), litres_milli: Number(fuel.litres_milli), price_per_litre_paise: Number(fuel.price_per_litre_paise), odometer_km: Number(fuel.odometer_km) }); onNotify('Fuel transaction recorded.') } catch (error) { onNotify(error.message) } }
  const submitToll = async (event) => { event.preventDefault(); try { await createTollTransaction(token, { ...toll, vehicle_id: Number(toll.vehicle_id), amount_paise: Number(toll.amount_paise) }); onNotify('Toll transaction recorded.') } catch (error) { onNotify(error.message) } }
  return <div><PageHeader eyebrow="Finance & analytics" title="Costs & finance" subtitle="Understand the true cost of every kilometre, vehicle, and route." /><section className="panel table-panel"><div className="table-header"><div><h2>Record operating cost</h2><span>Expenses, fuel, and tolls write to the finance ledger.</span></div></div><form className="form-grid" onSubmit={submit}><select value={expense.category} onChange={(event) => setExpense({ ...expense, category: event.target.value })}><option>Maintenance</option><option>Fuel</option><option>Tolls</option><option>People & admin</option></select><input required placeholder="Description" value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} /><input required type="number" placeholder="Amount paise" value={expense.amount_paise} onChange={(event) => setExpense({ ...expense, amount_paise: event.target.value })} /><input type="number" placeholder="GST paise" value={expense.gst_amount_paise} onChange={(event) => setExpense({ ...expense, gst_amount_paise: event.target.value })} /><select value={expense.vehicle_id} onChange={(event) => setExpense({ ...expense, vehicle_id: event.target.value })}><option value="">Organization</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input type="date" value={expense.incurred_on} onChange={(event) => setExpense({ ...expense, incurred_on: event.target.value })} /><input placeholder="Vendor" value={expense.vendor} onChange={(event) => setExpense({ ...expense, vendor: event.target.value })} /><button className="primary-button" type="submit">Record expense</button></form></section><section className="panel table-panel"><div className="table-header"><div><h2>Fuel entry</h2><span>Capture litres, price, odometer, and vehicle.</span></div></div><form className="form-grid" onSubmit={submitFuel}><select required value={fuel.vehicle_id} onChange={(event) => setFuel({ ...fuel, vehicle_id: event.target.value })}><option value="">Vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input placeholder="Station" value={fuel.station} onChange={(event) => setFuel({ ...fuel, station: event.target.value })} /><input required type="number" placeholder="Litres × 1000" value={fuel.litres_milli} onChange={(event) => setFuel({ ...fuel, litres_milli: event.target.value })} /><input required type="number" placeholder="Price/litre paise" value={fuel.price_per_litre_paise} onChange={(event) => setFuel({ ...fuel, price_per_litre_paise: event.target.value })} /><input required type="number" placeholder="Odometer km" value={fuel.odometer_km} onChange={(event) => setFuel({ ...fuel, odometer_km: event.target.value })} /><input type="date" value={fuel.incurred_on} onChange={(event) => setFuel({ ...fuel, incurred_on: event.target.value })} /><button className="primary-button" type="submit">Save fuel</button></form></section><section className="panel table-panel"><div className="table-header"><div><h2>Toll entry</h2><span>Record FASTag and toll-operator costs.</span></div></div><form className="form-grid" onSubmit={submitToll}><select required value={toll.vehicle_id} onChange={(event) => setToll({ ...toll, vehicle_id: event.target.value })}><option value="">Vehicle</option>{fleet.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.reg}</option>)}</select><input required placeholder="Plaza" value={toll.plaza} onChange={(event) => setToll({ ...toll, plaza: event.target.value })} /><input placeholder="Operator" value={toll.toll_operator} onChange={(event) => setToll({ ...toll, toll_operator: event.target.value })} /><input required type="number" placeholder="Amount paise" value={toll.amount_paise} onChange={(event) => setToll({ ...toll, amount_paise: event.target.value })} /><input type="date" value={toll.incurred_on} onChange={(event) => setToll({ ...toll, incurred_on: event.target.value })} /><button className="primary-button" type="submit">Save toll</button></form></section><div className="metric-grid compact"><MetricCard label="Recorded spend" value={`₹${(total / 100000).toFixed(1)}L`} change="live" detail="from expense ledger" icon="₹" tone="navy" /><MetricCard label="Fuel spend" value={`₹${(categoryTotal('Fuel') / 100000).toFixed(1)}L`} change="live" detail="recorded fuel" icon="◉" tone="orange" /><MetricCard label="Maintenance spend" value={`₹${(categoryTotal('Maintenance') / 100000).toFixed(1)}L`} change="live" detail="recorded maintenance" icon="⌁" tone="green" /><MetricCard label="Pending review" value={expenses.filter((item) => item.status !== 'Approved').length} change="live" detail="expense records" icon="!" tone="purple" /></div><div className="content-grid"><section className="panel cost-panel"><PanelHeading title="Spend by category" meta="Live expense ledger" action="View ledger" onAction={() => onNotify('Expense ledger opened.')} /><div className="bar-chart">{['Fuel', 'Maintenance', 'Tolls', 'People & admin'].map((category) => { const amount = categoryTotal(category); return <div className="bar-row" key={category}><span>{category}</span><div><i style={{ width: `${total ? Math.max(4, amount / total * 100) : 4}%` }}></i></div><strong>₹{(amount / 100000).toFixed(1)}L</strong></div> })}</div></section><section className="panel"><PanelHeading title="Recent expenses" meta={`${expenses.length} records`} action="See all" onAction={() => onNotify('All expenses opened.')} /><div className="expense-list">{expenses.slice(0, 5).map((item) => <div className="expense-item" key={item.id}><div className="expense-icon">₹</div><div><strong>{item.description}</strong><span>{fleet.find((vehicle) => vehicle.id === item.vehicle_id)?.reg || item.vendor || 'Organization'}</span></div><strong>₹{(item.amount_paise / 100).toLocaleString('en-IN')}</strong><select value={item.status} onChange={async (event) => { try { const updated = await updateExpense(token, item.id, { status: event.target.value }); onNotify('Expense status updated.'); onExpenseUpdated(updated) } catch (error) { onNotify(error.message) } }}><option>Pending</option><option>Approved</option><option>Rejected</option></select>{item.status === 'Pending' && <button className="row-more" onClick={async () => { try { const updated = await reconcileExpense(token, item.id); onExpenseUpdated(updated); onNotify('Expense reconciled.') } catch (error) { onNotify(error.message) } }}>Reconcile</button>}</div>)}</div></section></div></div>
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
