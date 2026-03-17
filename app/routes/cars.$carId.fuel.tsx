import { useState } from 'react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Form, useActionData, useNavigation, Link, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { getCarById, getFuelLogs, addFuelLog, deleteFuelLog, updateFuelLog } from '~/models/car.server';
import { formatDate, formatCurrency, formatMileage } from '~/utils/format';

export function meta() {
  return [{ title: 'Fuel Log — Car Work Tracker' }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response('Not Found', { status: 404 });

  const logs = await getFuelLogs(params.carId!);

  // --- Analytics ---
  const totalFillUps = logs.length;
  const totalGallons = logs.reduce((s, l) => s + l.gallons, 0);
  const totalFuelCost = logs.reduce((s, l) => s + (l.totalCost ?? 0), 0);

  // MPG: only between consecutive full-tank entries (chronological order)
  const chronoLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const fullTankLogs = chronoLogs.filter(l => l.fullTank);

  // Build a map: logId -> mpg (only for full tank logs that have a prior full tank)
  const mpgMap: Record<string, number> = {};
  for (let i = 1; i < fullTankLogs.length; i++) {
    const prev = fullTankLogs[i - 1];
    const curr = fullTankLogs[i];
    const mileageDiff = curr.mileage - prev.mileage;
    if (mileageDiff > 0 && curr.gallons > 0) {
      mpgMap[curr.id] = mileageDiff / curr.gallons;
    }
  }

  const mpgValues = Object.values(mpgMap);
  const avgMpg = mpgValues.length > 0 ? mpgValues.reduce((s, v) => s + v, 0) / mpgValues.length : null;
  const bestMpg = mpgValues.length > 0 ? Math.max(...mpgValues) : null;
  const worstMpg = mpgValues.length > 0 ? Math.min(...mpgValues) : null;

  // Cost per mile
  const mileages = logs.map(l => l.mileage);
  const maxMileage = mileages.length > 0 ? Math.max(...mileages) : null;
  const minMileage = mileages.length > 0 ? Math.min(...mileages) : null;
  const mileageSpan = maxMileage !== null && minMileage !== null && maxMileage > minMileage ? maxMileage - minMileage : null;
  const costPerMile = mileageSpan && totalFuelCost > 0 ? totalFuelCost / mileageSpan : null;

  // Last 12 months fuel cost by month
  const now = new Date();
  const monthlyFuelCost: Array<{ label: string; total: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const total = logs
      .filter(l => {
        const ld = new Date(l.date);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth() && l.totalCost != null;
      })
      .reduce((s, l) => s + (l.totalCost ?? 0), 0);
    monthlyFuelCost.push({ label, total });
  }

  // Serialise mpgMap as array for table rendering (logs are desc)
  return json({
    car,
    logs,
    mpgMap,
    analytics: {
      totalFillUps,
      totalGallons,
      totalFuelCost,
      avgMpg,
      bestMpg,
      worstMpg,
      costPerMile,
      monthlyFuelCost,
    },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  if (intent === 'add') {
    const dateStr = String(formData.get('date') ?? '').trim();
    const mileageStr = String(formData.get('mileage') ?? '').trim();
    const gallonsStr = String(formData.get('gallons') ?? '').trim();
    const pricePerGallonStr = String(formData.get('pricePerGallon') ?? '').trim();
    const totalCostStr = String(formData.get('totalCost') ?? '').trim();
    const fullTank = formData.get('fullTank') === 'on';
    const notes = String(formData.get('notes') ?? '').trim() || null;

    if (!dateStr) return json({ error: 'Date is required' }, { status: 400 });
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return json({ error: 'Invalid date' }, { status: 400 });

    if (!mileageStr) return json({ error: 'Mileage is required' }, { status: 400 });
    const mileage = parseInt(mileageStr, 10);
    if (isNaN(mileage) || mileage < 0) return json({ error: 'Mileage must be >= 0' }, { status: 400 });

    if (!gallonsStr) return json({ error: 'Gallons is required' }, { status: 400 });
    const gallons = parseFloat(gallonsStr);
    if (isNaN(gallons) || gallons <= 0) return json({ error: 'Gallons must be > 0' }, { status: 400 });

    let pricePerGallon: number | null = null;
    if (pricePerGallonStr) {
      pricePerGallon = parseFloat(pricePerGallonStr);
      if (isNaN(pricePerGallon) || pricePerGallon < 0) return json({ error: 'Price per gallon must be >= 0' }, { status: 400 });
    }

    let totalCost: number | null = null;
    if (totalCostStr) {
      totalCost = parseFloat(totalCostStr);
      if (isNaN(totalCost) || totalCost < 0) return json({ error: 'Total cost must be >= 0' }, { status: 400 });
    } else if (pricePerGallon !== null) {
      totalCost = gallons * pricePerGallon;
    }

    try {
      await addFuelLog(carId, { date, mileage, gallons, pricePerGallon, totalCost, fullTank, notes }, userId);
      return redirect(`/cars/${carId}/fuel`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (intent === 'delete') {
    const logId = String(formData.get('logId') ?? '').trim();
    if (!logId) return json({ error: 'Log ID is required' }, { status: 400 });
    try {
      await deleteFuelLog(logId, carId, userId);
      return redirect(`/cars/${carId}/fuel`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (intent === 'update') {
    const logId = String(formData.get('logId') ?? '').trim();
    if (!logId) return json({ error: 'Log ID is required' }, { status: 400 });

    const dateStr = String(formData.get('date') ?? '').trim();
    const mileageStr = String(formData.get('mileage') ?? '').trim();
    const gallonsStr = String(formData.get('gallons') ?? '').trim();
    const pricePerGallonStr = String(formData.get('pricePerGallon') ?? '').trim();
    const totalCostStr = String(formData.get('totalCost') ?? '').trim();
    const fullTank = formData.get('fullTank') === 'on';
    const notes = String(formData.get('notes') ?? '').trim() || null;

    if (!dateStr) return json({ error: 'Date is required' }, { status: 400 });
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return json({ error: 'Invalid date' }, { status: 400 });

    if (!mileageStr) return json({ error: 'Mileage is required' }, { status: 400 });
    const mileage = parseInt(mileageStr, 10);
    if (isNaN(mileage) || mileage < 0) return json({ error: 'Mileage must be >= 0' }, { status: 400 });

    if (!gallonsStr) return json({ error: 'Gallons is required' }, { status: 400 });
    const gallons = parseFloat(gallonsStr);
    if (isNaN(gallons) || gallons <= 0) return json({ error: 'Gallons must be > 0' }, { status: 400 });

    let pricePerGallon: number | null = null;
    if (pricePerGallonStr) {
      pricePerGallon = parseFloat(pricePerGallonStr);
      if (isNaN(pricePerGallon) || pricePerGallon < 0) return json({ error: 'Price per gallon must be >= 0' }, { status: 400 });
    }

    let totalCost: number | null = null;
    if (totalCostStr) {
      totalCost = parseFloat(totalCostStr);
      if (isNaN(totalCost) || totalCost < 0) return json({ error: 'Total cost must be >= 0' }, { status: 400 });
    } else if (pricePerGallon !== null) {
      totalCost = gallons * pricePerGallon;
    }

    try {
      await updateFuelLog(logId, carId, { date, mileage, gallons, pricePerGallon, totalCost, fullTank, notes }, userId);
      return redirect(`/cars/${carId}/fuel`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  return json({ error: 'Unknown action' }, { status: 400 });
}

export default function FuelLog() {
  const { car, logs, mpgMap, analytics } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const todayStr = new Date().toISOString().slice(0, 10);

  // Client-side computed total cost hint
  const [gallonsInput, setGallonsInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [totalCostInput, setTotalCostInput] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const computedCostHint =
    gallonsInput && priceInput && !totalCostInput
      ? (parseFloat(gallonsInput) * parseFloat(priceInput)).toFixed(2)
      : null;

  const { totalFillUps, totalGallons, totalFuelCost, avgMpg, bestMpg, costPerMile, monthlyFuelCost } = analytics;

  const maxMonthly = Math.max(...monthlyFuelCost.map(m => m.total), 1);
  const hasMonthlyData = monthlyFuelCost.some(m => m.total > 0);

  const mpgValues = Object.values(mpgMap as Record<string, number>);
  const maxMpg = mpgValues.length > 0 ? Math.max(...mpgValues) : 1;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h1>Fuel Log — {car.year} {car.make} {car.model}</h1>
          <p className="text-muted">{formatMileage(car.currentMileage)}</p>
        </div>
        <div className="flex gap-sm">
          {logs.length > 0 && (
            <a href={`/cars/${car.id}/fuel/export`} className="btn btn-secondary btn-sm">⬇ Export CSV</a>
          )}
          <Link to={`/cars/${car.id}`} className="btn btn-secondary">← Back</Link>
        </div>
      </div>

      {actionData?.error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{actionData.error}</div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalFillUps}</div>
          <div className="text-muted text-sm">Total Fill-ups</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalGallons.toFixed(1)}</div>
          <div className="text-muted text-sm">Total Gallons</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {avgMpg !== null ? avgMpg.toFixed(1) : '—'}
          </div>
          <div className="text-muted text-sm">Avg MPG</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {totalFuelCost > 0 ? formatCurrency(totalFuelCost) : '—'}
          </div>
          <div className="text-muted text-sm">Total Fuel Cost</div>
        </div>
        {costPerMile !== null && (
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${costPerMile.toFixed(3)}</div>
            <div className="text-muted text-sm">Cost / Mile</div>
          </div>
        )}
      </div>

      {/* Log fill-up form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Log Fill-up</h2>
        <Form method="post">
          <input type="hidden" name="intent" value="add" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input id="date" name="date" type="date" required defaultValue={todayStr} className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="mileage">Mileage *</label>
              <input
                id="mileage"
                name="mileage"
                type="number"
                required
                min={0}
                defaultValue={car.currentMileage}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label htmlFor="gallons">Gallons *</label>
              <input
                id="gallons"
                name="gallons"
                type="number"
                required
                min={0.001}
                step="0.001"
                className="form-control"
                value={gallonsInput}
                onChange={e => setGallonsInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pricePerGallon">Price / Gal</label>
              <input
                id="pricePerGallon"
                name="pricePerGallon"
                type="number"
                min={0}
                step="0.001"
                className="form-control"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="totalCost">
                Total Cost
                {computedCostHint && (
                  <span className="text-muted text-sm" style={{ marginLeft: '0.4rem' }}>
                    (≈ ${computedCostHint})
                  </span>
                )}
              </label>
              <input
                id="totalCost"
                name="totalCost"
                type="number"
                min={0}
                step="0.01"
                className="form-control"
                placeholder={computedCostHint ? `$${computedCostHint}` : ''}
                value={totalCostInput}
                onChange={e => setTotalCostInput(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input id="fullTank" name="fullTank" type="checkbox" defaultChecked style={{ width: 'auto' }} />
              <label htmlFor="fullTank" style={{ margin: 0 }}>Full Tank</label>
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
              <label htmlFor="notes">Notes</label>
              <input id="notes" name="notes" type="text" className="form-control" placeholder="Optional notes" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ alignSelf: 'flex-end' }}>
              {isSubmitting ? 'Saving…' : '+ Log Fill-up'}
            </button>
          </div>
        </Form>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ fontSize: '2rem', margin: 0 }}>⛽</p>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Log your first fill-up to start tracking fuel efficiency and costs.</p>
        </div>
      ) : (
        <>
          {/* 12-month fuel cost bar chart */}
          {hasMonthlyData && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2>12-Month Fuel Cost</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', marginBottom: '0.5rem' }}>
                {monthlyFuelCost.map(m => {
                  const heightPct = Math.max(m.total > 0 ? 4 : 0, Math.round((m.total / maxMonthly) * 76));
                  return (
                    <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        title={`${m.label}: ${formatCurrency(m.total)}`}
                        style={{
                          background: m.total > 0 ? '#1e40af' : '#e5e7eb',
                          borderRadius: '3px 3px 0 0',
                          width: '100%',
                          height: `${heightPct}px`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                {monthlyFuelCost.map(m => (
                  <div key={m.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: '#6b7280', overflow: 'hidden' }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MPG bar chart */}
          {mpgValues.length >= 2 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2>MPG per Fill-up</h2>
              {avgMpg !== null && (
                <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>
                  Avg: {avgMpg.toFixed(1)} mpg · Best: {analytics.bestMpg?.toFixed(1)} · Worst: {analytics.worstMpg?.toFixed(1)}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', marginBottom: '0.5rem' }}>
                {/* Show in chronological order for the chart */}
                {[...logs]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .filter(l => (mpgMap as Record<string, number>)[l.id] !== undefined)
                  .map(l => {
                    const mpg = (mpgMap as Record<string, number>)[l.id];
                    const heightPct = Math.max(4, Math.round((mpg / maxMpg) * 76));
                    const aboveAvg = avgMpg !== null && mpg >= avgMpg;
                    return (
                      <div key={l.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                          title={`${formatDate(l.date)}: ${mpg.toFixed(1)} mpg`}
                          style={{
                            background: aboveAvg ? '#16a34a' : '#dc2626',
                            borderRadius: '3px 3px 0 0',
                            width: '100%',
                            height: `${heightPct}px`,
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
              <p className="text-sm text-muted">Green = above average, Red = below average. Hover for details.</p>
            </div>
          )}

          {/* Fuel history table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Fuel History ({logs.length})</h2>
              <a href={`/cars/${car.id}/fuel/export`} className="btn btn-secondary btn-sm">⬇ Export CSV</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mileage</th>
                    <th>Gallons</th>
                    <th>Price/Gal</th>
                    <th>Total Cost</th>
                    <th>MPG</th>
                    <th>Full Tank</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const mpg = (mpgMap as Record<string, number>)[log.id];
                    return (
                      <>
                        <tr key={log.id}>
                          <td>{formatDate(log.date)}</td>
                          <td>{log.mileage.toLocaleString()}</td>
                          <td>{log.gallons.toFixed(3)}</td>
                          <td>{log.pricePerGallon != null ? formatCurrency(log.pricePerGallon) : '—'}</td>
                          <td>{log.totalCost != null ? formatCurrency(log.totalCost) : '—'}</td>
                          <td>
                            {mpg !== undefined ? (
                              <span style={{ color: avgMpg !== null && mpg >= avgMpg ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                {mpg.toFixed(1)}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>{log.fullTank ? '✓' : ''}</td>
                          <td className="text-muted text-sm">{log.notes ?? '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingLogId(editingLogId === log.id ? null : log.id)}
                              >
                                {editingLogId === log.id ? 'Cancel' : 'Edit'}
                              </button>
                              <Form
                                method="post"
                                style={{ display: 'inline' }}
                                onSubmit={e => {
                                  if (!window.confirm('Delete this fuel log entry?')) e.preventDefault();
                                }}
                              >
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="logId" value={log.id} />
                                <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmitting}>✕</button>
                              </Form>
                            </div>
                          </td>
                        </tr>
                        {editingLogId === log.id && (
                          <tr key={`edit-${log.id}`}>
                            <td colSpan={9} style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                              <Form method="post">
                                <input type="hidden" name="intent" value="update" />
                                <input type="hidden" name="logId" value={log.id} />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Date *</label>
                                    <input name="date" type="date" required defaultValue={log.date.slice(0, 10)} className="form-control" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Mileage *</label>
                                    <input name="mileage" type="number" required min={0} defaultValue={log.mileage} className="form-control" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Gallons *</label>
                                    <input name="gallons" type="number" required min={0.001} step="0.001" defaultValue={log.gallons} className="form-control" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Price / Gal</label>
                                    <input name="pricePerGallon" type="number" min={0} step="0.001" defaultValue={log.pricePerGallon ?? ''} className="form-control" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Total Cost</label>
                                    <input name="totalCost" type="number" min={0} step="0.01" defaultValue={log.totalCost ?? ''} className="form-control" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Notes</label>
                                    <input name="notes" type="text" defaultValue={log.notes ?? ''} className="form-control" />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <input
                                      id={`fullTank-${log.id}`}
                                      name="fullTank"
                                      type="checkbox"
                                      defaultChecked={log.fullTank}
                                      style={{ width: 'auto' }}
                                    />
                                    <label htmlFor={`fullTank-${log.id}`} style={{ margin: 0 }}>Full Tank</label>
                                  </div>
                                  <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : 'Save Changes'}
                                  </button>
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingLogId(null)}>
                                    Cancel
                                  </button>
                                </div>
                              </Form>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="card">
      <h2>Error</h2>
      {isRouteErrorResponse(error) ? (
        <p className="text-muted">{error.status} — {error.data}</p>
      ) : (
        <p className="text-muted">{(error as Error)?.message ?? 'An unexpected error occurred.'}</p>
      )}
      <Link to=".." className="btn btn-secondary" style={{ marginTop: '1rem' }}>← Go Back</Link>
    </div>
  );
}
