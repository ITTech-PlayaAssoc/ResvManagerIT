import React, { useState } from 'react';
import { ProcessedList } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { es, enUS, fr } from 'date-fns/locale';
import { Calendar, FolderOpen, History, PlusCircle, Trash2, X, LayoutDashboard, List as ListIcon, Users, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

interface SidebarProps {
  lists: ProcessedList[];
  currentListId: string | null;
  onSelectList: (id: string) => void;
  onNewList: () => void;
  onDeleteList: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activeView: 'dashboard' | 'listados' | 'usuarios' | 'configuracion';
  onSelectView: (view: 'dashboard' | 'listados' | 'usuarios' | 'configuracion') => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ lists, currentListId, onSelectList, onNewList, onDeleteList, isOpen, onClose, activeView, onSelectView, isAdmin = false }) => {
  const { t, language } = useLanguage();
  const { settings } = useSettings();
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleYear = (year: string) => setExpandedYears(prev => ({...prev, [year]: !prev[year]}));
  const toggleMonth = (key: string) => setExpandedMonths(prev => ({...prev, [key]: !prev[key]}));

  const getLocale = () => {
    if (language === 'es') return es;
    if (language === 'fr') return fr;
    return enUS;
  };

  // Group lists by Year and Month
  const groupedLists = lists.reduce((acc, list) => {
    try {
      const date = parseISO(list.date);
      if (!isValid(date)) throw new Error('Invalid date');
      const year = format(date, 'yyyy');
      const month = format(date, 'MMMM', { locale: getLocale() });
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      
      acc[year][month].push(list);
    } catch (e) {
      // Fallback if date is invalid
      const year = t('unknown');
      const month = t('unknown');
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push(list);
    }
    return acc;
  }, {} as Record<string, Record<string, ProcessedList[]>>);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0b1120] border-r border-slate-800 flex flex-col h-screen transition-transform duration-300 md:relative md:translate-x-0 flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold text-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center border border-emerald-500/30 overflow-hidden">
                {settings.appIcon ? (
                  <img src={settings.appIcon} alt="App Icon" className="w-full h-full object-cover" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
              </div>
              <span className="truncate max-w-[120px]">{settings.appTitle || 'RESV-MANAGER'}</span>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 space-y-1">
          <button 
            onClick={() => onSelectView('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm">{t('dashboard')}</span>
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => onSelectView('listados')} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === 'listados' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                <ListIcon className="w-4 h-4" />
                <span className="text-sm">{t('listings')}</span>
              </button>
              <button 
                onClick={() => onSelectView('usuarios')} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === 'usuarios' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm">{t('users')}</span>
              </button>
            </>
          )}
          <button 
            onClick={() => onSelectView('configuracion')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === 'configuracion' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{t('settings')}</span>
          </button>
        </div>

        {activeView === 'listados' && isAdmin && (
          <>
            <div className="px-6 pt-6 pb-2">
              <button 
                onClick={onNewList}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                {t('newList')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4 custom-scrollbar">
              {Object.keys(groupedLists).sort((a,b) => Number(b) - Number(a)).map(year => (
                <div key={year} className="space-y-2">
                  <button 
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors py-1"
                  >
                    <span>{year}</span>
                    {expandedYears[year] === false ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedYears[year] !== false && (
                    <div className="space-y-3 pl-2">
                      {Object.keys(groupedLists[year]).map(month => {
                        const monthKey = `${year}-${month}`;
                        return (
                          <div key={month} className="space-y-1">
                            <button 
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full text-sm font-medium text-slate-400 hover:text-slate-200 flex items-center justify-between capitalize transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5" />
                                {month}
                              </div>
                              {expandedMonths[monthKey] === false ? <ChevronRight className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
                            </button>
                            
                            {expandedMonths[monthKey] !== false && (
                              <ul className="space-y-1 ml-4 border-l border-slate-800 pl-2">
                                {groupedLists[year][month].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(list => (
                                  <li key={list.id} className="flex items-center group">
                                    <button
                                      onClick={() => onSelectList(list.id)}
                                      className={`flex-1 text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2
                                        ${currentListId === list.id 
                                          ? 'text-emerald-400 border-l border-emerald-500/50 bg-slate-800/50 font-medium' 
                                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                        }
                                      `}
                                    >
                                      <History className="w-3 h-3 opacity-50" />
                                      {format(parseISO(list.date), 'dd MMM yyyy')}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteList(list.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all rounded-md"
                                      title="Borrar lista"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {lists.length === 0 && (
                <div className="text-center text-sm text-slate-500 mt-10">
                  {t('archivedLists')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
