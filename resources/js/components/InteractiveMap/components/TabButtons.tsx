import React from 'react';
import { TabType } from '../types';

interface TabButtonsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const TabButtons: React.FC<TabButtonsProps> = ({ activeTab, onTabChange }) => {
    const tabs: { key: TabType; label: string }[] = [
        { key: 'descarga', label: 'Descarga' },
        { key: 'analisis', label: 'Exportar Area' }
    ];

    return (
        <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
                <button 
                    key={tab.key}
                    className={`flex-1 py-3 px-2 text-sm font-medium ${
                        activeTab === tab.key 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => onTabChange(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
