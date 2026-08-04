import { Navigate, Outlet } from 'react-router-dom'

import { useBusiness } from '../hooks/useBusiness'

function RequireBusiness() {
  const { businesses, loading } = useBusiness()

  if (loading) {
    return null
  }

  if (businesses.length === 0) {
    return (
      <Navigate
        to="/create-business"
        replace
      />
    )
  }

  return <Outlet />
}

export default RequireBusiness