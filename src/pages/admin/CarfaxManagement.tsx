import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ExternalLink, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  vin: string;
  stock_number: string;
  carfax_report_url: string | null;
  carfax_has_accident: boolean;
  carfax_no_accidents: boolean;
  carfax_one_owner: boolean;
  carfax_well_maintained: boolean;
  carfax_service_records_count: number;
  carfax_great_reliability: boolean;
  carfax_value_rating: string | null;
}

interface CarfaxFormData {
  carfax_report_url: string;
  carfax_has_accident: boolean;
  carfax_no_accidents: boolean;
  carfax_one_owner: boolean;
  carfax_well_maintained: boolean;
  carfax_service_records_count: number;
  carfax_great_reliability: boolean;
  carfax_value_rating: string;
}

export default function CarfaxManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [formData, setFormData] = useState<CarfaxFormData>({
    carfax_report_url: '',
    carfax_has_accident: false,
    carfax_no_accidents: false,
    carfax_one_owner: false,
    carfax_well_maintained: false,
    carfax_service_records_count: 0,
    carfax_great_reliability: false,
    carfax_value_rating: '',
  });
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'idle' | 'saving' | 'success' | 'error' }>({});

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error loading vehicles:', error);
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  }

  function startEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle.id);
    setFormData({
      carfax_report_url: vehicle.carfax_report_url || '',
      carfax_has_accident: vehicle.carfax_has_accident,
      carfax_no_accidents: vehicle.carfax_no_accidents,
      carfax_one_owner: vehicle.carfax_one_owner,
      carfax_well_maintained: vehicle.carfax_well_maintained,
      carfax_service_records_count: vehicle.carfax_service_records_count,
      carfax_great_reliability: vehicle.carfax_great_reliability,
      carfax_value_rating: vehicle.carfax_value_rating || '',
    });
  }

  function cancelEdit() {
    setEditingVehicle(null);
    setFormData({
      carfax_report_url: '',
      carfax_has_accident: false,
      carfax_no_accidents: false,
      carfax_one_owner: false,
      carfax_well_maintained: false,
      carfax_service_records_count: 0,
      carfax_great_reliability: false,
      carfax_value_rating: '',
    });
  }

  async function saveCarfaxData(vehicleId: string) {
    setSaveStatus({ ...saveStatus, [vehicleId]: 'saving' });

    const updateData: any = {
      carfax_report_url: formData.carfax_report_url || null,
      carfax_has_accident: formData.carfax_has_accident,
      carfax_no_accidents: formData.carfax_no_accidents,
      carfax_one_owner: formData.carfax_one_owner,
      carfax_well_maintained: formData.carfax_well_maintained,
      carfax_service_records_count: formData.carfax_service_records_count,
      carfax_great_reliability: formData.carfax_great_reliability,
      carfax_value_rating: formData.carfax_value_rating || null,
    };

    const { error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', vehicleId);

    if (error) {
      console.error('Error saving CARFAX data:', error);
      setSaveStatus({ ...saveStatus, [vehicleId]: 'error' });
      setTimeout(() => setSaveStatus({ ...saveStatus, [vehicleId]: 'idle' }), 3000);
    } else {
      setSaveStatus({ ...saveStatus, [vehicleId]: 'success' });
      setTimeout(() => setSaveStatus({ ...saveStatus, [vehicleId]: 'idle' }), 2000);
      setEditingVehicle(null);
      loadVehicles();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Manual CARFAX Verification Required</h3>
            <div className="text-gray-300 space-y-2 text-sm">
              <p className="font-medium">CRITICAL: All CARFAX data must be manually verified from actual CARFAX reports.</p>
              <p>This system does NOT automatically parse CARFAX reports. You must:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Obtain the official CARFAX report for each vehicle</li>
                <li>Manually review the report for accuracy</li>
                <li>Set flags based ONLY on what the report explicitly states</li>
                <li>Store the CARFAX report URL for audit purposes</li>
              </ol>
              <p className="font-medium mt-3 text-yellow-300">Accident Detection Rules:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Has Accident = TRUE:</strong> Report explicitly shows "Accident reported"</li>
                <li><strong>No Accidents = TRUE:</strong> Report explicitly shows "No accidents or damage reported"</li>
                <li><strong>Both FALSE:</strong> Unknown/unconfirmed status (show no badges)</li>
                <li><strong>NEVER set both to TRUE</strong> - they are mutually exclusive</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">VIN</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">CARFAX Report</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Accident Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Highlights</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-white/5 transition-colors">
                  {editingVehicle === vehicle.id ? (
                    <td colSpan={6} className="px-6 py-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">
                            Edit CARFAX Data: {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            CARFAX Report URL
                          </label>
                          <input
                            type="url"
                            value={formData.carfax_report_url}
                            onChange={(e) => setFormData({ ...formData, carfax_report_url: e.target.value })}
                            placeholder="https://www.carfax.com/VehicleHistory/..."
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase">Accident Status</h4>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.carfax_has_accident}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  carfax_has_accident: e.target.checked,
                                  carfax_no_accidents: e.target.checked ? false : formData.carfax_no_accidents
                                })}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-white">Has Accident</span>
                            </label>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.carfax_no_accidents}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  carfax_no_accidents: e.target.checked,
                                  carfax_has_accident: e.target.checked ? false : formData.carfax_has_accident
                                })}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-white">No Accidents</span>
                            </label>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase">Ownership & Reliability</h4>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.carfax_one_owner}
                                onChange={(e) => setFormData({ ...formData, carfax_one_owner: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-white">1-Owner</span>
                            </label>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.carfax_great_reliability}
                                onChange={(e) => setFormData({ ...formData, carfax_great_reliability: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-white">Great Reliability</span>
                            </label>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase">Maintenance</h4>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.carfax_well_maintained}
                                onChange={(e) => setFormData({ ...formData, carfax_well_maintained: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-white">Well Maintained</span>
                            </label>
                            <div>
                              <label className="block text-sm text-gray-300 mb-2">Service Records Count</label>
                              <input
                                type="number"
                                min="0"
                                value={formData.carfax_service_records_count}
                                onChange={(e) => setFormData({ ...formData, carfax_service_records_count: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase">Value Rating</h4>
                            <select
                              value={formData.carfax_value_rating}
                              onChange={(e) => setFormData({ ...formData, carfax_value_rating: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                            >
                              <option value="" className="bg-gray-900 text-white">No Rating</option>
                              <option value="great" className="bg-gray-900 text-white">Great Value</option>
                              <option value="good" className="bg-gray-900 text-white">Good Value</option>
                              <option value="fair" className="bg-gray-900 text-white">Fair Value</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
                          <button
                            onClick={cancelEdit}
                            className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveCarfaxData(vehicle.id)}
                            disabled={saveStatus[vehicle.id] === 'saving'}
                            className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span>{saveStatus[vehicle.id] === 'saving' ? 'Saving...' : 'Save Changes'}</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-gray-400 text-sm">{vehicle.trim}</div>
                        <div className="text-gray-500 text-xs">Stock: {vehicle.stock_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 text-sm font-mono">{vehicle.vin}</div>
                      </td>
                      <td className="px-6 py-4">
                        {vehicle.carfax_report_url ? (
                          <a
                            href={vehicle.carfax_report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View Report</span>
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">No URL</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {vehicle.carfax_has_accident && vehicle.carfax_no_accidents ? (
                          <div className="flex items-center space-x-2 text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-semibold">ERROR: Both flags set!</span>
                          </div>
                        ) : vehicle.carfax_has_accident ? (
                          <div className="flex items-center space-x-2 text-yellow-400">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm">Has Accident</span>
                          </div>
                        ) : vehicle.carfax_no_accidents ? (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">No Accidents</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {vehicle.carfax_one_owner && (
                            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">1-Owner</span>
                          )}
                          {vehicle.carfax_well_maintained && (
                            <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">Well Maintained</span>
                          )}
                          {vehicle.carfax_great_reliability && (
                            <span className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 text-xs">Great Reliability</span>
                          )}
                          {vehicle.carfax_value_rating && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              vehicle.carfax_value_rating === 'great' ? 'bg-yellow-500/20 text-yellow-400' :
                              vehicle.carfax_value_rating === 'good' ? 'bg-green-500/20 text-green-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {vehicle.carfax_value_rating === 'great' ? 'Great Value' :
                               vehicle.carfax_value_rating === 'good' ? 'Good Value' : 'Fair Value'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => startEdit(vehicle)}
                          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Edit CARFAX</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
