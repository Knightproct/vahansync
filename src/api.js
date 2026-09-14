import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const useSupabaseAuth = Boolean(supabase) && !API_BASE_URL.includes('localhost')
function mapVehicle(vehicle) {
  return {
    ...vehicle,
    reg: vehicle.registration_number,
    km: `${vehicle.odometer_km.toLocaleString()} km`,
    driver: vehicle.driver_name || 'Unassigned',
    accent: vehicle.status === 'In workshop' ? 'orange' : vehicle.status === 'On route' ? 'blue' : 'green',
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function login(email, password) {
  if (useSupabaseAuth) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.session) {
      return { access_token: data.session.access_token, token_type: 'bearer' }
    }
    throw new Error(error?.message || 'Unable to sign in')
  }
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signupOrganization(payload) {
  return request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(async (result) => {
    if (useSupabaseAuth) {
      return login(payload.email, payload.password)
    }
    return result
  })
}

export function acceptInvitation(payload) {
  return request('/api/v1/auth/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(async (result) => {
    if (useSupabaseAuth) {
      return login(result.user.email, payload.password)
    }
    return result
  })
}

export function createInvitation(token, payload) {
  return request('/api/v1/invitations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export function getInvitations(token) {
  return request('/api/v1/invitations', { headers: { Authorization: `Bearer ${token}` } })
}

export function getVehicles(token) {
  return request('/api/v1/vehicles', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((vehicles) => vehicles.map(mapVehicle))
}

export function updateVehicle(token, vehicleId, payload) {
  return request(`/api/v1/vehicles/${vehicleId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(mapVehicle)
}

export function getCurrentUser(token) {
  return request('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
}

export function getSubscription(token) {
  return request('/api/v1/subscription', { headers: { Authorization: `Bearer ${token}` } })
}

export function createSubscriptionCheckout(token, planCode) {
  return request('/api/v1/subscription/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan_code: planCode }),
  })
}

export function verifySubscriptionPayment(token, payment) {
  return request('/api/v1/subscription/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payment),
  })
}

export function getNotificationPreferences(token) {
  return request('/api/v1/notification-preferences', { headers: { Authorization: `Bearer ${token}` } })
}

export function updateNotificationPreference(token, preference) {
  return request('/api/v1/notification-preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(preference),
  })
}

export function createVehicle(token, vehicle) {
  return request('/api/v1/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      registration_number: vehicle.reg,
      model: vehicle.model,
      vehicle_type: vehicle.type,
      depot: vehicle.depot,
      status: 'Idle / parked',
      health: 100,
      odometer_km: 0,
      driver_name: null,
    }),
  }).then(mapVehicle)
}

export function getWorkOrders(token) {
  return request('/api/v1/work-orders', { headers: { Authorization: `Bearer ${token}` } })
}

export function createWorkOrder(token, workOrder) {
  return request('/api/v1/work-orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(workOrder),
  })
}

export function getComponents(token) {
  return request('/api/v1/components', { headers: { Authorization: `Bearer ${token}` } })
}

export function createComponent(token, component) {
  return request('/api/v1/components', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(component),
  })
}

export function updateComponent(token, componentId, payload) {
  return request(`/api/v1/components/${componentId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export function completeComponentService(token, componentId, odometerKm) {
  return request(`/api/v1/components/${componentId}/service-complete?odometer_km=${odometerKm}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getMaintenancePlans(token) {
  return request('/api/v1/maintenance-plans', { headers: { Authorization: `Bearer ${token}` } })
}

export function getParts(token) {
  return request('/api/v1/parts', { headers: { Authorization: `Bearer ${token}` } })
}

export function getExpenses(token) {
  return request('/api/v1/expenses', { headers: { Authorization: `Bearer ${token}` } })
}

export function createExpense(token, expense) {
  return request('/api/v1/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(expense),
  })
}

export function getDocuments(token) {
  return request('/api/v1/documents', { headers: { Authorization: `Bearer ${token}` } })
}

export function getVendors(token) {
  return request('/api/v1/vendors', { headers: { Authorization: `Bearer ${token}` } })
}

export function createVendor(token, vendor) {
  return request('/api/v1/vendors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(vendor),
  })
}

export function getPurchaseOrders(token) {
  return request('/api/v1/purchase-orders', { headers: { Authorization: `Bearer ${token}` } })
}

export function downloadUrl(path) {
  return `${API_BASE_URL}${path}`
}

export async function downloadFile(token, path, filename) {
  const response = await fetch(downloadUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Download failed with status ${response.status}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportResource(token, resource) {
  return fetch(downloadUrl(`/api/v1/export/${resource}`), {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Export failed with status ${response.status}`)
    return response.blob()
  })
}

export function getAlerts(token) {
  return request('/api/v1/alerts', { headers: { Authorization: `Bearer ${token}` } })
}

export function getNotifications(token) {
  return request('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } })
}

export function getTelematicsIntegrations(token) {
  return request('/api/v1/telematics/integrations', { headers: { Authorization: `Bearer ${token}` } })
}

export function syncDueTelematics(token) {
  return request('/api/v1/telematics/sync-due', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function updateNotification(token, notificationId, status) {
  return request(`/api/v1/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}
