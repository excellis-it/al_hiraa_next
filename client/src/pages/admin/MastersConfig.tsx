import { useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Layers, MapPin, Building, BookOpen, Users, CalendarCheck } from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetTradesQuery, useCreateTradeMutation, useUpdateTradeMutation,
  useGetStatesQuery, useCreateStateMutation, useUpdateStateMutation,
  useGetCitiesQuery, useCreateCityMutation, useUpdateCityMutation,
  useGetSourcesQuery, useCreateSourceMutation, useUpdateSourceMutation,
  useGetVenuesQuery, useCreateVenueMutation, useUpdateVenueMutation,
} from '../../store/api/mastersApi';
import {
  useGetReferrersQuery, useCreateReferrerMutation, useUpdateReferrerMutation,
} from '../../store/api/referrersApi';
import toast from 'react-hot-toast';

type Tab = 'trades' | 'states' | 'cities' | 'sources' | 'referrers' | 'venues';

function MasterTable({
  title,
  addPlaceholder,
  data,
  isLoading,
  onAdd,
  onToggle,
  extraColumn,
  extraHeader,
}: {
  title: string;
  addPlaceholder: string;
  data: any[];
  isLoading: boolean;
  onAdd: (name: string) => void;
  onToggle: (id: number, is_active: boolean) => void;
  extraColumn?: (item: any) => React.ReactNode;
  extraHeader?: string;
}) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
  };

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="flex gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={addPlaceholder}
          className="flex-1 max-w-sm px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <button
          onClick={handleAdd}
          className="btn-primary"
        >
          <Plus size={15} />
          Add {title.slice(0, -1)}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-th w-16">#</th>
                <th className="table-th">Name</th>
                {extraHeader && <th className="table-th">{extraHeader}</th>}
                <th className="table-th w-24">Status</th>
                <th className="table-th w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((item: any) => (
                <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="table-td text-gray-400 font-mono text-xs">{item.id}</td>
                  <td className="table-td font-medium text-gray-800">{item.name}</td>
                  {extraColumn && <td className="table-td text-gray-500 text-sm">{extraColumn(item)}</td>}
                  <td className="table-td">
                    <span className={item.is_active ? 'badge-green' : 'badge-gray'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => onToggle(item.id, !item.is_active)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        item.is_active
                          ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {item.is_active
                        ? <><ToggleLeft size={13} /> Deactivate</>
                        : <><ToggleRight size={13} /> Activate</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr>
                  <td colSpan={extraHeader ? 5 : 4} className="table-td text-center py-10 text-gray-300">
                    <p className="text-sm">No {title.toLowerCase()} yet. Add one above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length > 0 && (
        <p className="text-xs text-gray-400">
          {data.filter((d: any) => d.is_active).length} active / {data.length} total
        </p>
      )}
    </div>
  );
}

// ─── Referrers Panel (name + phone) ──────────────────────────────────────────
function ReferrersPanel({
  referrers, isLoading, onCreate, onToggle,
}: {
  referrers: any[];
  isLoading: boolean;
  onCreate: (name: string, phone: string) => void;
  onToggle: (id: number, is_active: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), phone.trim());
    setName('');
    setPhone('');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Referrer full name…"
          className="flex-1 min-w-[180px] max-w-xs px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Phone (optional)"
          className="flex-1 min-w-[140px] max-w-[200px] px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <button onClick={handleAdd} className="btn-primary">
          <Plus size={15} /> Add Referrer
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Referrers appear in candidate registration when Mode = <strong>Referral</strong>. Add anyone who regularly refers candidates — staff, existing candidates, community contacts.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-th w-16">#</th>
                <th className="table-th">Name</th>
                <th className="table-th">Phone</th>
                <th className="table-th w-24">Status</th>
                <th className="table-th w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {referrers.map((r: any) => (
                <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="table-td text-gray-400 font-mono text-xs">{r.id}</td>
                  <td className="table-td font-medium text-gray-800">{r.name}</td>
                  <td className="table-td text-gray-500 text-sm">{r.phone || '—'}</td>
                  <td className="table-td">
                    <span className={r.is_active ? 'badge-green' : 'badge-gray'}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => onToggle(r.id, !r.is_active)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        r.is_active
                          ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {r.is_active
                        ? <><ToggleLeft size={13} /> Deactivate</>
                        : <><ToggleRight size={13} /> Activate</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {referrers.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-td text-center py-10 text-gray-300">
                    <p className="text-sm">No referrers yet. Add one above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {referrers.length > 0 && (
        <p className="text-xs text-gray-400">
          {referrers.filter((r: any) => r.is_active).length} active / {referrers.length} total
        </p>
      )}
    </div>
  );
}

// ─── Venues Panel (name + address + city + phone) ───────────────────────────
function VenuesPanel({
  venues, isLoading, onCreate, onToggle,
}: {
  venues: any[];
  isLoading: boolean;
  onCreate: (data: { name: string; address?: string; city?: string; phone?: string; google_maps_url?: string }) => void;
  onToggle: (id: number, is_active: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), address: address.trim() || undefined, city: city.trim() || undefined, phone: phone.trim() || undefined, google_maps_url: mapsUrl.trim() || undefined });
    setName(''); setAddress(''); setCity(''); setPhone(''); setMapsUrl('');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Venue name…"
          className="flex-1 min-w-[180px] max-w-xs px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)"
          className="flex-1 min-w-[180px] max-w-xs px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)"
          className="flex-1 min-w-[120px] max-w-[160px] px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)"
          className="flex-1 min-w-[120px] max-w-[160px] px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Google Maps URL (optional)"
          className="flex-1 min-w-[200px] max-w-xs px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        <button onClick={handleAdd} className="btn-primary"><Plus size={15} /> Add Venue</button>
      </div>
      <p className="text-xs text-gray-400">
        Interview venues appear in the interview creation form as a dropdown. Add all regular interview locations.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-th w-16">#</th>
                <th className="table-th">Name</th>
                <th className="table-th">Address</th>
                <th className="table-th">City</th>
                <th className="table-th">Phone</th>
                <th className="table-th w-24">Status</th>
                <th className="table-th w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v: any) => (
                <tr key={v.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="table-td text-gray-400 font-mono text-xs">{v.id}</td>
                  <td className="table-td font-medium text-gray-800">{v.name}</td>
                  <td className="table-td text-gray-500 text-sm">{v.address || '—'}</td>
                  <td className="table-td text-gray-500 text-sm">{v.city || '—'}</td>
                  <td className="table-td text-gray-500 text-sm">{v.phone || '—'}</td>
                  <td className="table-td">
                    <span className={v.is_active ? 'badge-green' : 'badge-gray'}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => onToggle(v.id, !v.is_active)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        v.is_active
                          ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {v.is_active
                        ? <><ToggleLeft size={13} /> Deactivate</>
                        : <><ToggleRight size={13} /> Activate</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {venues.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center py-10 text-gray-300">
                    <p className="text-sm">No interview venues yet. Add one above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {venues.length > 0 && (
        <p className="text-xs text-gray-400">
          {venues.filter((v: any) => v.is_active).length} active / {venues.length} total
        </p>
      )}
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'trades',    label: 'Trades',    icon: <Layers size={14} /> },
  { key: 'states',    label: 'States',    icon: <MapPin size={14} /> },
  { key: 'cities',    label: 'Cities',    icon: <Building size={14} /> },
  { key: 'sources',   label: 'Sources',   icon: <BookOpen size={14} /> },
  { key: 'referrers', label: 'Referrers', icon: <Users size={14} /> },
  { key: 'venues',    label: 'Interview Venues', icon: <CalendarCheck size={14} /> },
];

export default function MastersConfig() {
  const [activeTab, setActiveTab] = useState<Tab>('trades');
  const [selectedState, setSelectedState] = useState<number | undefined>();

  const { data: trades, isLoading: tradesLoading } = useGetTradesQuery(true);
  const { data: states, isLoading: statesLoading } = useGetStatesQuery(true);
  const { data: cities, isLoading: citiesLoading } = useGetCitiesQuery({ state_id: selectedState, all: true });
  const { data: sources, isLoading: sourcesLoading } = useGetSourcesQuery(true);
  const { data: referrers, isLoading: referrersLoading } = useGetReferrersQuery(true);

  const [createTrade] = useCreateTradeMutation();
  const [updateTrade] = useUpdateTradeMutation();
  const [createState] = useCreateStateMutation();
  const [updateState] = useUpdateStateMutation();
  const [createCity] = useCreateCityMutation();
  const [updateCity] = useUpdateCityMutation();
  const [createSource] = useCreateSourceMutation();
  const [updateSource] = useUpdateSourceMutation();
  const [createReferrer] = useCreateReferrerMutation();
  const [updateReferrer] = useUpdateReferrerMutation();
  const { data: venues, isLoading: venuesLoading } = useGetVenuesQuery(true);
  const [createVenue] = useCreateVenueMutation();
  const [updateVenue] = useUpdateVenueMutation();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Masters Configuration</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage reference data — trades, locations, and lead sources</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 w-fit shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className={activeTab === tab.key ? 'text-white' : 'text-gray-400'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div className="card p-6">
        {activeTab === 'trades' && (
          <MasterTable
            title="Trades"
            addPlaceholder="e.g., Welding, Plumbing, Electrical..."
            data={trades || []}
            isLoading={tradesLoading}
            onAdd={async (name) => {
              try { await createTrade({ name }).unwrap(); toast.success('Trade added'); }
              catch { toast.error('Failed to add trade'); }
            }}
            onToggle={async (id, is_active) => {
              try { await updateTrade({ id, is_active }).unwrap(); toast.success('Updated'); }
              catch { toast.error('Failed to update'); }
            }}
          />
        )}

        {activeTab === 'states' && (
          <MasterTable
            title="States"
            addPlaceholder="e.g., West Bengal, Bihar..."
            data={states || []}
            isLoading={statesLoading}
            onAdd={async (name) => {
              try { await createState({ name }).unwrap(); toast.success('State added'); }
              catch { toast.error('Failed to add state'); }
            }}
            onToggle={async (id, is_active) => {
              try { await updateState({ id, is_active }).unwrap(); toast.success('Updated'); }
              catch { toast.error('Failed to update'); }
            }}
          />
        )}

        {activeTab === 'cities' && (
          <div className="space-y-4">
            <Select
              label="Filter by State"
              className="max-w-xs"
              value={selectedState || ''}
              onChange={(e) => setSelectedState(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All States</option>
              {states?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>

            <MasterTable
              title="Cities"
              addPlaceholder={selectedState ? 'e.g., Kolkata, Siliguri...' : 'Select a state first'}
              data={cities || []}
              isLoading={citiesLoading}
              onAdd={async (name) => {
                if (!selectedState) { toast.error('Select a state first'); return; }
                try { await createCity({ name, state_id: selectedState }).unwrap(); toast.success('City added'); }
                catch { toast.error('Failed to add city'); }
              }}
              onToggle={async (id, is_active) => {
                try { await updateCity({ id, is_active }).unwrap(); toast.success('Updated'); }
                catch { toast.error('Failed to update'); }
              }}
              extraHeader="State"
              extraColumn={(item) => item.state?.name || '—'}
            />
          </div>
        )}

        {activeTab === 'sources' && (
          <MasterTable
            title="Sources"
            addPlaceholder="e.g., Facebook, Camp Drive, TV Ad..."
            data={sources || []}
            isLoading={sourcesLoading}
            onAdd={async (name) => {
              try { await createSource({ name }).unwrap(); toast.success('Source added'); }
              catch { toast.error('Failed to add source'); }
            }}
            onToggle={async (id, is_active) => {
              try { await updateSource({ id, is_active }).unwrap(); toast.success('Updated'); }
              catch { toast.error('Failed to update'); }
            }}
          />
        )}

        {activeTab === 'referrers' && (
          <ReferrersPanel
            referrers={referrers || []}
            isLoading={referrersLoading}
            onCreate={async (name, phone) => {
              try { await createReferrer({ name, phone }).unwrap(); toast.success('Referrer added'); }
              catch { toast.error('Failed to add referrer'); }
            }}
            onToggle={async (id, is_active) => {
              try { await updateReferrer({ id, is_active }).unwrap(); toast.success('Updated'); }
              catch { toast.error('Failed to update'); }
            }}
          />
        )}

        {activeTab === 'venues' && (
          <VenuesPanel
            venues={venues || []}
            isLoading={venuesLoading}
            onCreate={async (data) => {
              try { await createVenue(data).unwrap(); toast.success('Venue added'); }
              catch { toast.error('Failed to add venue'); }
            }}
            onToggle={async (id, is_active) => {
              try { await updateVenue({ id, is_active }).unwrap(); toast.success('Updated'); }
              catch { toast.error('Failed to update'); }
            }}
          />
        )}
      </div>
    </div>
  );
}
