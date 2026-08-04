import { useMemo, useState } from 'react'
import { useCurrency } from '../hooks/useCurrency'
import { useNavigate } from 'react-router-dom'

const MARKETPLACES = ['eBay', 'Vinted', 'Etsy', 'Depop'] as const

const DEFAULT_FEES: Record<string, number> = {
  eBay: 0.13,
  Vinted: 0.05,
  Etsy: 0.065,
  Depop: 0.1,
}

function Pricing() {
  const { money } = useCurrency()
  const navigate = useNavigate()

  const [purchaseCost, setPurchaseCost] = useState(10)
  const [additionalCosts, setAdditionalCosts] = useState(0)
  const [shipping, setShipping] = useState(3)
  const [marketplace, setMarketplace] = useState<(typeof MARKETPLACES)[number]>('eBay')
  const [marketplaceFeePct, setMarketplaceFeePct] = useState(13)
  const [desiredProfit, setDesiredProfit] = useState(10)

  const calc = useMemo(() => {
    const totalCost = purchaseCost + additionalCosts + shipping
    const feeRate = marketplaceFeePct / 100
    // min price so that price*(1-fee) - totalCost = desiredProfit
    // price = (totalCost + desiredProfit) / (1 - feeRate)
    const minPrice = feeRate < 1 ? (totalCost + desiredProfit) / (1 - feeRate) : 0

    const ladder = [20, 25, 30, 35, 40].map((price) => {
      const net = price * (1 - feeRate) - totalCost
      return { price, profit: net, margin: price > 0 ? (net / price) * 100 : 0 }
    })

    return { totalCost, feeRate, minPrice, ladder }
  }, [purchaseCost, additionalCosts, shipping, marketplaceFeePct, desiredProfit])

  function selectMarketplace(mp: (typeof MARKETPLACES)[number]) {
    setMarketplace(mp)
    setMarketplaceFeePct(Math.round((DEFAULT_FEES[mp] ?? 0.1) * 100))
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Pricing Calculator</h1>
          <p>Work out the minimum selling price to hit your target profit.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Costs & fees</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
              Purchase cost
              <input type="number" min="0" step="0.5" value={purchaseCost} onChange={(e) => setPurchaseCost(Number(e.target.value) || 0)}
                style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
              Additional costs
              <input type="number" min="0" step="0.5" value={additionalCosts} onChange={(e) => setAdditionalCosts(Number(e.target.value) || 0)}
                style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
              Shipping cost
              <input type="number" min="0" step="0.5" value={shipping} onChange={(e) => setShipping(Number(e.target.value) || 0)}
                style={inputStyle} />
            </label>

            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Marketplace</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {MARKETPLACES.map((mp) => (
                  <button
                    key={mp}
                    type="button"
                    onClick={() => selectMarketplace(mp)}
                    className={`btn ${marketplace === mp ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {mp}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
              Marketplace fee (%)
              <input type="number" min="0" max="100" step="0.5" value={marketplaceFeePct} onChange={(e) => setMarketplaceFeePct(Number(e.target.value) || 0)}
                style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
              Desired profit
              <input type="number" min="0" step="0.5" value={desiredProfit} onChange={(e) => setDesiredProfit(Number(e.target.value) || 0)}
                style={inputStyle} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Minimum selling price</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
              To cover {money(calc.totalCost)} of costs and earn {money(desiredProfit)} profit on {marketplace}.
            </p>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--shq-accent)' }}>
              {money(calc.minPrice, { maximumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              <Row label="Total costs" value={money(calc.totalCost)} />
              <Row label="Marketplace fee" value={`${marketplaceFeePct}%`} />
              <Row label="Fee on min price" value={money(calc.minPrice * calc.feeRate, { maximumFractionDigits: 2 })} />
              <Row label="Desired profit" value={money(desiredProfit)} />
            </div>
          </div>

          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Price ladder</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.ladder.map((row) => (
                    <tr key={row.price}>
                      <td>{money(row.price)}</td>
                      <td style={{ color: row.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {money(row.profit, { maximumFractionDigits: 2 })}
                      </td>
                      <td>{row.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/inventory')}>
          Back to inventory
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--shq-border)',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'var(--shq-bg)',
  color: 'var(--shq-ink)',
  boxSizing: 'border-box',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--shq-border)' }}>
      <span style={{ color: 'var(--shq-ink-muted)' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default Pricing
