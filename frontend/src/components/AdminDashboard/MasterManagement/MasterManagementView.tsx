import React, { useState } from 'react';
import { Users, Leaf, Package, MessageSquareX, MapPin, ThumbsUp, Globe } from 'lucide-react';
import UserManagementView from '../../UserManagement/UserManagementView';
import CropsMasterView from './CropsMasterView';
import ProductsMasterView from './ProductsMasterView';
import NonPurchaseReasonsMasterView from './NonPurchaseReasonsMasterView';
import StateLanguageMappingView from './StateLanguageMappingView';
import SentimentsMasterView from './SentimentsMasterView';
import LanguagesMasterView from './LanguagesMasterView';

type MasterTab = 'users' | 'crops' | 'products' | 'nonPurchaseReasons' | 'languages' | 'stateLanguage' | 'sentiments';

const MasterManagementView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<MasterTab>('users');

  const subTabs: Array<{ id: MasterTab; label: string; icon: React.ElementType }> = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'crops', label: 'Crops', icon: Leaf },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'nonPurchaseReasons', label: 'Non-Purchase Reasons', icon: MessageSquareX },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'stateLanguage', label: 'State-Language', icon: MapPin },
    { id: 'sentiments', label: 'Sentiments', icon: ThumbsUp },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation pills */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-2">
        <div className="flex flex-wrap gap-2">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'users' && <UserManagementView />}
        {activeSubTab === 'crops' && <CropsMasterView />}
        {activeSubTab === 'products' && <ProductsMasterView />}
        {activeSubTab === 'nonPurchaseReasons' && <NonPurchaseReasonsMasterView />}
        {activeSubTab === 'languages' && <LanguagesMasterView />}
        {activeSubTab === 'stateLanguage' && <StateLanguageMappingView />}
        {activeSubTab === 'sentiments' && <SentimentsMasterView />}
      </div>
    </div>
  );
};

export default MasterManagementView;
