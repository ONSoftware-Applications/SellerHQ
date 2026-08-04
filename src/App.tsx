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
import { ExpenseProvider } from './context/ExpenseContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeController } from './components/ThemeController'
import ToastViewport from './components/ToastViewport'
import { ErrorBoundary } from './components/ErrorBoundary'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import CreateBusiness from './pages/CreateBusiness'
import RequireBusiness from './components/RequireBusiness'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Listings = lazy(() => import('./pages/Listings'))
const Sales = lazy(() => import('./pages/Sales'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Forecasts = lazy(() => import('./pages/Forecasts'))
const Tax = lazy(() => import('./pages/Tax'))
const Settings = lazy(() => import('./pages/Settings'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Reports = lazy(() => import('./pages/Reports'))
const Profile = lazy(() => import('./pages/Profile'))

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
        <BusinessProvider>
          <ProductProvider>
            <ExpenseProvider>
              <SettingsProvider>
                <ThemeController />
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

                      <Route element={<Layout />}>
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
                            <Route
                              path="/listings"
                              element={<Listings />}
                            />
                            <Route
                              path="/sales"
                              element={<Sales />}
                            />
                            <Route
                              path="/expenses"
                              element={<Expenses />}
                            />
                            <Route
                              path="/forecasts"
                              element={<Forecasts />}
                            />
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
                              path="/reports"
                              element={<Reports />}
                            />
                            <Route
                              path="/profile"
                              element={<Profile />}
                            />
                          </Route>
                        </Route>
                      </Route>
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </BrowserRouter>
                </SettingsProvider>
              </ExpenseProvider>
            </ProductProvider>
          </BusinessProvider>
        </AuthProvider>
      </ToastProvider>
    )
  }

  export default App