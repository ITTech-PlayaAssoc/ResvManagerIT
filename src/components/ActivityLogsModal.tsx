import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog } from '../utils/logger';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { es, enUS, fr } from 'date-fns/locale';
import { 
  X, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Clock, 
  User, 
  Shield, 
  List, 
  CheckCircle2, 
  Settings, 
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const getLocale = () => {
    if (language === 'es') return es;
    if (language === 'fr') return fr;
    return enUS;
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(150));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: ActivityLog[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLog));
      setLogs(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showClearConfirm) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showClearConfirm, onClose]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const queryLower = searchQuery.toLowerCase();
      const userName = (log.userName || '').toLowerCase();
      const userEmail = (log.userEmail || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const details = (log.details || '').toLowerCase();

      return userName.includes(queryLower) || 
             userEmail.includes(queryLower) || 
             action.includes(queryLower) || 
             details.includes(queryLower);
    });
  }, [logs, selectedCategory, searchQuery]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Fecha y Hora', 'Usuario', 'Email', 'Rol', 'Categoria', 'Accion', 'Detalles'];
    const rows = filteredLogs.map(l => {
      let dateFormatted = l.timestamp;
      try {
        const d = parseISO(l.timestamp);
        if (isValid(d)) dateFormatted = format(d, 'yyyy-MM-dd HH:mm:ss');
      } catch {}

      return [
        `"${dateFormatted}"`,
        `"${(l.userName || '').replace(/"/g, '""')}"`,
        `"${(l.userEmail || '').replace(/"/g, '""')}"`,
        `"${l.userRole || ''}"`,
        `"${l.category || ''}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllLogs = async () => {
    try {
      setIsClearing(true);
      const snapshot = await getDocs(collection(db, 'logs'));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'logs', d.id)));
      await Promise.all(deletePromises);
      setLogs([]);
      setShowClearConfirm(false);
    } catch (err: any) {
      console.error("Error clearing logs:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'list':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('categoryList')}</span>;
      case 'reservation':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{t('categoryReservation')}</span>;
      case 'user':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t('categoryUser')}</span>;
      case 'settings':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('categorySettings')}</span>;
      case 'auth':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{t('categoryAuth')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">{category}</span>;
    }
  };

  if (!isOpen) return null;

  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-5xl w-full h-[90vh] max-h-[850px] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {t('activityLogs')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-normal">
                  {filteredLogs.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {t('activityLogsDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredLogs.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                title={t('exportLogs')}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('exportLogs')}</span>
              </button>
            )}

            {isAdminOrOwner && logs.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                title={t('clearLogs')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('clearLogs')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
              title={t('cancel')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchLogsPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl pl-9 pr-4 py-2 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: t('allCategories') },
              { id: 'list', label: t('categoryList') },
              { id: 'reservation', label: t('categoryReservation') },
              { id: 'user', label: t('categoryUser') },
              { id: 'settings', label: t('categorySettings') },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs">Cargando registros de actividad...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <Clock className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">{t('noLogsFound')}</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                let formattedDate = log.timestamp;
                let timeAgo = '';
                try {
                  const d = parseISO(log.timestamp);
                  if (isValid(d)) {
                    formattedDate = format(d, 'dd MMM yyyy, HH:mm:ss', { locale: getLocale() });
                    timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: getLocale() });
                  }
                } catch {}

                return (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* User Avatar */}
                      <div className="relative mt-0.5 shrink-0">
                        {log.userPhoto ? (
                          <img
                            src={log.userPhoto}
                            alt={log.userName}
                            className="w-9 h-9 rounded-full border border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                            {log.userName ? log.userName.charAt(0) : 'U'}
                          </div>
                        )}
                        {log.userRole === 'owner' || log.userRole === 'admin' ? (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black" title={log.userRole}>
                            <Shield className="w-2.5 h-2.5" />
                          </div>
                        ) : null}
                      </div>

                      {/* Log details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">
                            {log.userName}
                          </span>
                          {log.userRole && (
                            <span className="text-[10px] text-slate-400 capitalize px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/50">
                              {log.userRole}
                            </span>
                          )}
                          <span className="text-slate-600 text-xs hidden sm:inline">•</span>
                          <span className="text-[11px] text-slate-500">
                            {log.userEmail}
                          </span>
                          <div className="ml-auto md:hidden">
                            {getCategoryBadge(log.category)}
                          </div>
                        </div>

                        <p className="text-xs font-medium text-slate-200 break-words">
                          {log.action}
                        </p>

                        {log.details && (
                          <p className="text-[11px] text-slate-400 mt-1 font-mono bg-slate-950/50 px-2 py-1 rounded border border-slate-800/60 inline-block max-w-full truncate">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Category & Timestamp */}
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t border-slate-800/40 md:border-t-0">
                      <div className="hidden md:block">
                        {getCategoryBadge(log.category)}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formattedDate}
                        </p>
                        {timeAgo && (
                          <p className="text-[10px] text-slate-500 capitalize">
                            {timeAgo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">{t('clearLogs')}</h4>
              <p className="text-xs text-slate-400 mb-6">{t('confirmClearLogs')}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearing}
                  className="flex-1 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllLogs}
                  disabled={isClearing}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg shadow-rose-900/20 disabled:opacity-50"
                >
                  {isClearing ? 'Borrando...' : t('confirmDeleteAction')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
