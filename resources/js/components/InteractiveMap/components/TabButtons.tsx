import React from 'react';
import { TabType } from '../types';

interface TabButtonsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const TabButtons: React.FC<TabButtonsProps> = ({ activeTab, onTabChange }) => {
    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'descarga', label: 'Descarga', icon: '🔍' },
        { key: 'satelitales', label: 'Satelitales', icon: '🛰️' },
        { key: 'analisis', label: 'Exportar Area', icon: '📤' }
    ];

    return (
        <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
                <button 
                    key={tab.key}
                    className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
                        activeTab === tab.key 
                            ? 'bg-blue-500 text-white border-b-2 border-blue-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => onTabChange(tab.key)}
                >
                    <div className="flex items-center justify-center gap-1">
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};
