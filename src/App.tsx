import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import './App.css'

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

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Listings = lazy(() => import('./pages/Listings'))
const Sales = lazy(() => import('./pages/Sales'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Receipts = lazy(() => import('./pages/Receipts'))
const Forecasts = lazy(() => import('./pages/Forecasts'))
const Tax = lazy(() => import('./pages/Tax'))
const Settings = lazy(() => import('./pages/Settings'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const Reports = lazy(() => import('./pages/Reports'))
const TeamHub = lazy(() => import('./pages/TeamHub'))
const Profile = lazy(() => import('./pages/Profile'))
const Install = lazy(() => import('./pages/Install'))
const Scan = lazy(() => import('./pages/Scan'))
const Legal = lazy(() => import('./pages/Legal'))
const Support = lazy(() => import('./pages/Support'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const BusinessCustomization = lazy(() => import('./pages/BusinessCustomization'))
const Relay = lazy(() => import('./pages/Relay'))
const Till = lazy(() => import('./pages/Till'))
const debugEnabled =
  import.meta.env.MODE === 'development' ||
  import.meta.env.VITE_ENABLE_DEBUG === 'true'
const DebugErrors = debugEnabled
  ? lazy(() => import('./pages/DebugErrors'))
  : null

function PageLoader() {
  return <div className="inventory-loading" style={{ minHeight: '40vh' }}>
    <div className="inventory-spinner" />
  </div>
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
                      <Route
                        path="/login"
                        element={<Login />}
                      />

                      <Route
                        path="/register"
                        element={<Register />}
                      />

                      <Route element={<ProtectedRoute />}>
                        <Route element={<RequireBusiness />}>
                          <Route element={<PlanGuard feature="tillMode" />}>
                            <Route
                              path="/till"
                              element={<Till />}
                            />
                          </Route>
                        </Route>
                      </Route>

                      <Route element={<Layout />}>
                        {DebugErrors && (
                          <Route
                            path="/debug/errors"
                            element={<DebugErrors />}
                          />
                        )}
                        <Route
                          path="/"
                          element={
                            <Navigate
                              to="/dashboard"
                              replace
                            />
                          }
                        />
                        <Route element={<ProtectedRoute />}>
                          <Route
                            path="/create-business"
                            element={<CreateBusiness />}
                          />
                          <Route element={<RequireBusiness />}>
                            <Route
                              path="/dashboard"
                              element={<Dashboard />}
                            />
                            <Route
                              path="/inventory"
                              element={<Inventory />}
                            />
                            <Route
                              path="/products/:productId"
                              element={<ProductDetails />}
                            />
                            <Route element={<PlanGuard feature="listings" />}>
                              <Route
                                path="/listings"
                                element={<Listings />}
                              />
                            </Route>
                            <Route
                              path="/sales"
                              element={<Sales />}
                            />
                            <Route
                              path="/expenses"
                              element={<Expenses />}
                            />
                            <Route
                              path="/receipts"
                              element={<Receipts />}
                            />
                            <Route element={<PlanGuard feature="forecasts" />}>
                              <Route
                                path="/forecasts"
                                element={<Forecasts />}
                              />
                            </Route>
                            <Route
                              path="/tax"
                              element={<Tax />}
                            />
                            <Route
                              path="/settings"
                              element={<Settings />}
                            />
                            <Route
                              path="/pricing"
                              element={<Pricing />}
                            />
                            <Route
                              path="/subscriptions"
                              element={<Subscriptions />}
                            />
                            <Route element={<PlanGuard feature="reports" />}>
                              <Route
                                path="/reports"
                                element={<Reports />}
                              />
                            </Route>
                            <Route
                              path="/team"
                              element={<TeamHub />}
                            />
                            <Route element={<PlanGuard feature="auditLog" />}>
                              <Route
                                path="/audit-log"
                                element={<AuditLog />}
                              />
                            </Route>
                            <Route
                              path="/profile"
                              element={<Profile />}
                            />
                            <Route
                              path="/install"
                              element={<Install />}
                            />
                            <Route element={<PlanGuard feature="qrScanner" />}>
                            <Route
                              path="/scan"
                              element={<Scan />}
                            />
                            </Route>
                            <Route element={<PlanGuard feature="qrRelay" />}>
                              <Route
                                path="/relay"
                                element={<Relay />}
                              />
                            </Route>
                            <Route
                              path="/support"
                              element={<Support />}
                            />
                            <Route
                              path="/legal/:page"
                              element={<Legal />}
                            />
                            <Route element={<PlanGuard feature="customization" />}>
                              <Route
                                path="/business"
                                element={<BusinessCustomization />}
                              />
                            </Route>
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