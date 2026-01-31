import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { ffaAPI } from '../../services/api';
import { Trash2, Database, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import Button from '../shared/Button';
import ConfirmationModal from '../shared/ConfirmationModal';

const DataManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [clearTransactions, setClearTransactions] = useState(true);
  const [clearMasters, setClearMasters] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [activityCount, setActivityCount] = useState(50);
  const [farmersPerActivity, setFarmersPerActivity] = useState(12);
  const [hierarchyFile, setHierarchyFile] = useState<File | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleClear = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    try {
      const res = await ffaAPI.clearData(clearTransactions, clearMasters);
      const counts = res.data ? Object.entries(res.data).filter(([, v]) => typeof v === 'number' && v > 0) : [];
      const msg = counts.length
        ? `Cleared: ${counts.map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').trim()}: ${v}`).join(', ')}`
        : res.message || 'Clear completed.';
      showToast(msg, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Clear failed', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await ffaAPI.seedFromHierarchy(hierarchyFile ?? null, activityCount, farmersPerActivity);
      const data = res?.data as { seed?: { activitiesGenerated?: number; farmersGenerated?: number }; hierarchyRowsUsed?: number } | undefined;
      const seedMsg = data?.seed
        ? `Generated ${data.seed.activitiesGenerated ?? 0} activities, ${data.seed.farmersGenerated ?? 0} farmers.`
        : '';
      const hierarchyMsg = data?.hierarchyRowsUsed ? ` Hierarchy: ${data.hierarchyRowsUsed} rows used.` : '';
      showToast(`${res?.message ?? 'Done.'} ${seedMsg}${hierarchyMsg} Full sync started – check sync progress.`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Generate & sync failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Data Management</h2>
        <p className="text-sm text-slate-600">Clear database and generate sample data via Mock FFA API (Indian names, optional Sales Hierarchy Excel).</p>
      </div>

      {/* Clear database */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="text-red-600" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Clear database</h3>
            <p className="text-xs text-slate-600">Remove transaction and/or master data. Use with caution.</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearTransactions}
                onChange={(e) => setClearTransactions(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-slate-300 text-lime-600 focus:ring-lime-500"
              />
              <span className="text-sm font-medium text-slate-800">Clear transaction data</span>
            </label>
            <span className="text-xs text-slate-500">(activities, farmers, tasks, sampling, cooling, etc.)</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearMasters}
                onChange={(e) => setClearMasters(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-slate-300 text-lime-600 focus:ring-lime-500"
              />
              <span className="text-sm font-medium text-slate-800">Clear master data</span>
            </label>
            <span className="text-xs text-slate-500">(crops, products, languages, sentiments, state-language, etc.)</span>
          </div>
          <Button
            variant="danger"
            onClick={() => setShowClearConfirm(true)}
            disabled={(!clearTransactions && !clearMasters) || clearing}
          >
            {clearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            <span>{clearing ? 'Clearing…' : 'Clear'}</span>
          </Button>
        </div>
      </div>

      {/* Generate data via Mock FFA */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Database className="text-lime-700" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Generate data via Mock FFA API</h3>
            <p className="text-xs text-slate-600">Set activity and farmer counts; optionally upload Sales Hierarchy Excel (Territory Code, Territory Name, Region Code, Region, Zone Code, Zone Name, BU). When you upload a hierarchy file and click Generate &amp; Sync, existing transaction data is cleared first so all activities and territories come from your file. Data uses Indian names.</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of activities</label>
              <input
                type="number"
                min={1}
                max={500}
                value={activityCount}
                onChange={(e) => setActivityCount(Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
                className="w-full min-h-12 px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farmers per activity</label>
              <input
                type="number"
                min={1}
                max={50}
                value={farmersPerActivity}
                onChange={(e) => setFarmersPerActivity(Math.max(1, Math.min(50, Number(e.target.value) || 12)))}
                className="w-full min-h-12 px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sales Hierarchy Excel (optional)</label>
            <p className="text-xs text-slate-500 mb-2">Download template for clearly labelled columns (Territory Name, Region, Zone Name, BU). Template includes an Instructions sheet.</p>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => ffaAPI.downloadHierarchyTemplate().then(() => showToast('Template downloaded', 'success')).catch(() => showToast('Download failed', 'error'))}
                className="text-sm font-medium text-lime-600 hover:text-lime-700"
              >
                Download template
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 border-dashed bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors min-h-12">
                <FileSpreadsheet size={20} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{hierarchyFile ? hierarchyFile.name : 'Choose .xlsx file'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setHierarchyFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {hierarchyFile && (
                <button
                  type="button"
                  onClick={() => setHierarchyFile(null)}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>{seeding ? 'Generating & syncing…' : 'Generate & sync'}</span>
          </Button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Clear database"
        message={
          clearTransactions && clearMasters
            ? 'This will permanently delete all transaction data and all master data. This cannot be undone.'
            : clearTransactions
              ? 'This will permanently delete all transaction data (activities, farmers, tasks, sampling, etc.). Masters will be kept.'
              : 'This will permanently delete all master data (crops, products, languages, etc.). Transaction data will be kept.'
        }
        confirmText="Clear"
        confirmVariant="danger"
        isLoading={clearing}
      />
    </div>
  );
};

export default DataManagementView;
