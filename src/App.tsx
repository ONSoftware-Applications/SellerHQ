import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import './App.css'
import './styles/ui-v2.css'
import './styles/ui-v2-extras.css'
import './styles/workspace-v2.css'

import { AuthProvider } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import { ProductProvider } from './context/ProductContext'
import { SettingsProvider } from './context/SettingsContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { TeamProvider } from './context/TeamContext'
import { AutoRelist } from './components/AutoRelist'
import { ExpenseProvider } from './context/ExpenseContext'
import { ReceiptProvider } from './context/ReceiptContext'
import { TillProvider } from './context/TillContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeController } from './components/ThemeController'
import ToastViewport from './components/ToastViewport'
import { ErrorBoundary } from './components/ErrorBoundary'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { PlanGuard } from './components/PlanGuard'

import Login from './pages/Login'
import Register from './pages/Register'
import CreateBusiness from './pages/CreateBusiness'
import RequireBusiness from './components/RequireBusiness'

const Dashboard = lazy(() => import('./pages/DashboardV2'))
const Inventory = lazy(() => import('./pages/InventoryWorkspace'))
const OrdersSales = lazy(() => import('./pages/OrdersSales'))
const Finance = lazy(() => import('./pages/FinanceWorkspace'))
const Analytics = lazy(() => import('./pages/AnalyticsWorkspace'))
const Settings = lazy(() => import('./pages/SettingsWorkspace'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Install = lazy(() => import('./pages/Install'))
const ScannerWorkspace = lazy(() => import('./pages/ScannerWorkspace'))
const Legal = lazy(() => import('./pages/Legal'))
const Support = lazy(() => import('./pages/Support'))
const Till = lazy(() => import('./pages/TillV2'))

const debugEnabled =
  import.meta.env.MODE === 'development' ||
  import.meta.env.VITE_ENABLE_DEBUG === 'true'

const DebugErrors = debugEnabled
  ? lazy(() => import('./pages/DebugErrors'))
  : null

function PageLoader() {
  return (
    <div className="inventory-loading" style={{ minHeight: '40vh' }}>
      <div className="inventory-spinner" />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <ToastViewport />
      <AuthProvider>
        <SettingsProvider>
          <BusinessProvider>
            <SubscriptionProvider>
              <TeamProvider>
                <ProductProvider>
                  <ExpenseProvider>
                    <ReceiptProvider>
                      <TillProvider>
                        <ThemeController />
                        <AutoRelist />
                        <BrowserRouter>
                          <ErrorBoundary>
                            <Suspense fallback={<PageLoader />}>
                              <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />

                                <Route element={<ProtectedRoute />}>
                                  <Route element={<RequireBusiness />}>
                                    <Route element={<PlanGuard feature="tillMode" />}>
                                      <Route path="/till" element={<Till />} />
                                    </Route>
                                  </Route>
                                </Route>

                                <Route element={<Layout />}>
                                  {DebugErrors && (
                                    <Route path="/debug/errors" element={<DebugErrors />} />
                                  )}

                                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                                  <Route element={<ProtectedRoute />}>
                                    <Route path="/create-business" element={<CreateBusiness />} />

                                    <Route element={<RequireBusiness />}>
                                      <Route path="/dashboard" element={<Dashboard />} />
                                      <Route path="/inventory" element={<Inventory />} />
                                      <Route path="/orders" element={<OrdersSales />} />
                                      <Route path="/finance" element={<Finance />} />

                                      <Route element={<PlanGuard feature="reports" />}>
                                        <Route path="/analytics" element={<Analytics />} />
                                      </Route>

                                      <Route path="/settings" element={<Settings />} />
                                      <Route path="/products/:productId" element={<ProductDetails />} />

                                      <Route path="/listings" element={<Navigate to="/inventory?view=listed" replace />} />
                                      <Route path="/pricing" element={<Navigate to="/inventory?view=pricing" replace />} />
                                      <Route path="/sales" element={<Navigate to="/orders" replace />} />
                                      <Route path="/expenses" element={<Navigate to="/finance?view=expenses" replace />} />
                                      <Route path="/receipts" element={<Navigate to="/finance?view=receipts" replace />} />
                                      <Route path="/tax" element={<Navigate to="/finance?view=tax" replace />} />
                                      <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                                      <Route path="/forecasts" element={<Navigate to="/analytics?view=forecast" replace />} />
                                      <Route path="/subscriptions" element={<Navigate to="/settings?view=billing" replace />} />
                                      <Route path="/team" element={<Navigate to="/settings?view=team" replace />} />
                                      <Route path="/profile" element={<Navigate to="/settings?view=account" replace />} />
                                      <Route path="/audit-log" element={<Navigate to="/settings?view=activity" replace />} />
                                      <Route path="/business" element={<Navigate to="/settings?view=business" replace />} />

                                      <Route path="/install" element={<Install />} />

                                      <Route element={<PlanGuard feature="qrScanner" />}>
                                        <Route path="/scan" element={<ScannerWorkspace />} />
                                      </Route>
                                      <Route path="/relay" element={<Navigate to="/scan" replace />} />

                                      <Route path="/support" element={<Support />} />
                                      <Route path="/legal/:page" element={<Legal />} />
                                    </Route>
                                  </Route>
                                </Route>
                              </Routes>
                            </Suspense>
                          </ErrorBoundary>
                        </BrowserRouter>
                      </TillProvider>
                    </ReceiptProvider>
                  </ExpenseProvider>
                </ProductProvider>
              </TeamProvider>
            </SubscriptionProvider>
          </BusinessProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
