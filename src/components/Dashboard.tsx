import React, { useState } from 'react';
import { ProcessedList, Reservation } from '../types';
import { format, addDays } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  lists: ProcessedList[];
}

const StatCard = ({ title, value, color = "text-slate-200" }: { title: string, value: number, color?: string }) => (
  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-center items-center text-center">
    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
    <span className={`text-3xl font-bold ${color}`}>{value}</span>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ lists }) => {
  const [selectedDay, setSelectedDay] = useState<'hoy' | 'manana'>('hoy');
  const { t } = useLanguage();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const targetDateStr = selectedDay === 'hoy' ? todayStr : tomorrowStr;

  const targetList = lists.find(l => {
    return format(new Date(l.date), 'yyyy-MM-dd') === targetDateStr;
  });

  if (!targetList) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex bg-slate-900 p-1 rounded-lg w-fit mb-6 border border-slate-800">
          <button
            onClick={() => setSelectedDay('hoy')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDay === 'hoy' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('today')} ({todayStr})
          </button>
          <button
            onClick={() => setSelectedDay('manana')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDay === 'manana' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tomorrow')} ({tomorrowStr})
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 mt-20">
          {selectedDay === 'hoy' ? t('noListForToday') : t('noListForTomorrow')} ({targetDateStr}).
        </div>
      </div>
    );
  }

  const reservations = targetList.reservations;
  const total = reservations.length;
  const reviewed = reservations.filter(r => r.isReviewed).length;
  const notReviewed = total - reviewed;
  const occupied = reservations.filter(r => r.isOccupied).length;
  const free = total - occupied;

  interface PropertyStats {
    total: number;
    reviewed: number;
    notReviewed: number;
    occupied: number;
    free: number;
    items: Reservation[];
  }

  const byProp = reservations.reduce((acc, r) => {
    if (!acc[r.prop]) acc[r.prop] = { total: 0, reviewed: 0, notReviewed: 0, occupied: 0, free: 0, items: [] };
    acc[r.prop].total++;
    if (r.isReviewed) acc[r.prop].reviewed++;
    else acc[r.prop].notReviewed++;
    
    if (r.isOccupied) acc[r.prop].occupied++;
    else acc[r.prop].free++;

    acc[r.prop].items.push(r);
    return acc;
  }, {} as Record<string, PropertyStats>);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex bg-slate-900 p-1 rounded-lg w-fit mb-6 border border-slate-800">
        <button
          onClick={() => setSelectedDay('hoy')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDay === 'hoy' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('today')} ({todayStr})
        </button>
        <button
          onClick={() => setSelectedDay('manana')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDay === 'manana' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('tomorrow')} ({tomorrowStr})
        </button>
      </div>
      <div className="flex-1">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title={t('totals')} value={total} />
            <StatCard title={t('reviewed')} value={reviewed} color="text-emerald-400" />
            <StatCard title={t('notReviewed')} value={notReviewed} color="text-amber-400" />
            <StatCard title={t('occupied')} value={occupied} color="text-red-400" />
            <StatCard title={t('free')} value={free} color="text-blue-400" />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-800 pb-2">{t('breakdownByProperty')}</h3>
            {Object.entries(byProp).map(([prop, stats]: [string, any]) => (
              <div key={prop} className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 border-b border-slate-800/50 pb-4">
                  <h4 className="font-bold text-lg text-emerald-400">{prop}</h4>
                  <div className="flex flex-wrap gap-3 md:gap-6 text-sm font-medium bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">{t('total')}: <span className="text-slate-200">{stats.total}</span></span>
                    <span className="text-emerald-400/80">{t('rev')}: <span className="text-emerald-400">{stats.reviewed}</span></span>
                    <span className="text-amber-400/80">{t('noRev')}: <span className="text-amber-400">{stats.notReviewed}</span></span>
                    <span className="text-red-400/80">{t('ocup')}: <span className="text-red-400">{stats.occupied}</span></span>
                    <span className="text-blue-400/80">{t('free')}: <span className="text-blue-400">{stats.free}</span></span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/10">
                     <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">{t('reviewed')} ({stats.reviewed})</h5>
                     <div className="flex flex-wrap gap-2">
                       {stats.items.filter((r: any) => r.isReviewed).map((r: any) => (
                         <span key={r.id} className="text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                           {r.unit}
                         </span>
                       ))}
                       {stats.reviewed === 0 && <span className="text-xs text-slate-600 italic">{t('noneReviewed')}</span>}
                     </div>
                   </div>
                   <div className="bg-amber-500/5 rounded-lg p-4 border border-amber-500/10">
                     <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">{t('notReviewed')} ({stats.notReviewed})</h5>
                     {stats.notReviewed === 0 ? (
                       <span className="text-xs text-slate-600 italic">{t('allReviewed')}</span>
                     ) : (
                       <div className="space-y-4">
                         {stats.items.some((r: any) => !r.isReviewed && r.isOccupied) && (
                           <div>
                             <h6 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                               {t('occupied')}
                             </h6>
                             <div className="flex flex-wrap gap-2">
                               {stats.items.filter((r: any) => !r.isReviewed && r.isOccupied).map((r: any) => (
                                 <span key={r.id} className="text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20 px-2.5 py-1 rounded-md">
                                   {r.unit}
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}

                         {stats.items.some((r: any) => !r.isReviewed && !r.isOccupied) && (
                           <div>
                             <h6 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                               {t('free')}
                             </h6>
                             <div className="flex flex-wrap gap-2">
                               {stats.items.filter((r: any) => !r.isReviewed && !r.isOccupied).map((r: any) => (
                                 <span key={r.id} className="text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-md">
                                   {r.unit}
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
