import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
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
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return { access_token: data.session.access_token, token_type: 'bearer' }
  }
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getVehicles(token) {
  return request('/api/v1/vehicles', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((vehicles) => vehicles.map(mapVehicle))
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

export function getPurchaseOrders(token) {
  return request('/api/v1/purchase-orders', { headers: { Authorization: `Bearer ${token}` } })
}

export function getAlerts(token) {
  return request('/api/v1/alerts', { headers: { Authorization: `Bearer ${token}` } })
}

export function getNotifications(token) {
  return request('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } })
}

export function updateNotification(token, notificationId, status) {
  return request(`/api/v1/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}
