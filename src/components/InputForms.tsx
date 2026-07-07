import React, { useState } from 'react';
import { FileImage, FileText, Loader2, Upload, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface InputFormsProps {
  checkInDate: string;
  setCheckInDate: (date: string) => void;
  checkOutDate: string;
  setCheckOutDate: (date: string) => void;
  onProcessCheckIn: (data: string, isImage: boolean, file?: File) => Promise<void>;
  onProcessCheckOut: (data: string, isImage: boolean, file?: File) => Promise<void>;
  isLoading: boolean;
}

export const InputForms: React.FC<InputFormsProps> = ({
  checkInDate, setCheckInDate,
  checkOutDate, setCheckOutDate,
  onProcessCheckIn, onProcessCheckOut,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ciMode, setCiMode] = useState<'text'|'image'>('text');
  const [coMode, setCoMode] = useState<'text'|'image'>('text');

  const [ciText, setCiText] = useState('');
  const [coText, setCoText] = useState('');
  
  const [ciFile, setCiFile] = useState<File | null>(null);
  const [coFile, setCoFile] = useState<File | null>(null);

  const { t } = useLanguage();

  const handleCiSubmit = async () => {
    if (ciMode === 'text' && ciText) {
      await onProcessCheckIn(ciText, false);
      setIsExpanded(false);
    } else if (ciMode === 'image' && ciFile) {
      await onProcessCheckIn('', true, ciFile);
      setIsExpanded(false);
    }
  };

  const handleCoSubmit = async () => {
    if (coMode === 'text' && coText) {
      await onProcessCheckOut(coText, false);
      setIsExpanded(false);
    } else if (coMode === 'image' && coFile) {
      await onProcessCheckOut('', true, coFile);
      setIsExpanded(false);
    }
  };

  return (
    <div className="mb-6 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden flex-shrink-0 shadow-sm transition-all">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-200">{t('importReservations') || 'Importar Reservas'}</h3>
            <p className="text-xs text-slate-500">{t('importReservationsDesc') || 'Añade o actualiza la lista de check-in / check-out'}</p>
          </div>
        </div>
        <div className="text-slate-400 p-2 hover:bg-slate-800 rounded-lg transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 md:p-6 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
          {/* Check In Panel */}
          <div className="space-y-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {t('phase1CheckIn') || 'Fase 1: Check In'} <span className="text-[10px] lowercase text-slate-500 font-normal block sm:inline">(CSV / Imagen)</span>
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-300 focus:border-emerald-500 outline-none"
                />
                <div className="flex bg-slate-800 p-0.5 rounded-md border border-slate-700">
                  <button 
                    onClick={() => setCiMode('text')}
                    className={`p-1 rounded text-xs flex items-center transition-colors ${ciMode === 'text' ? 'bg-[#0f172a] shadow text-emerald-400' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setCiMode('image')}
                    className={`p-1 rounded text-xs flex items-center transition-colors ${ciMode === 'image' ? 'bg-[#0f172a] shadow text-emerald-400' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <FileImage className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            {ciMode === 'text' ? (
              <div className="relative">
                <textarea 
                  className="input-area rounded-xl p-4 text-sm text-slate-300 resize-none h-32 focus:border-emerald-500 outline-none transition-colors w-full custom-scrollbar"
                  placeholder={t('pasteDataHere') || 'Pega aquí los datos de la tabla (TSV/CSV)...'}
                  value={ciText}
                  onChange={(e) => setCiText(e.target.value)}
                />
                {ciText && (
                  <button 
                    onClick={() => setCiText('')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Limpiar texto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="input-area rounded-xl p-4 h-32 flex flex-col items-center justify-center text-center group cursor-pointer relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setCiFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-8 h-8 text-slate-600 group-hover:text-emerald-500 mb-2 transition-colors" />
                <p className="text-xs text-slate-400">
                  {ciFile ? ciFile.name : (t('clickOrDragImage') || 'Haz clic o arrastra una imagen aquí')}
                </p>
              </div>
            )}
            <button 
              disabled={isLoading || (ciMode === 'text' ? !ciText : !ciFile)}
              onClick={handleCiSubmit}
              className="mt-2 w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 border border-slate-700 font-medium py-2 rounded-lg flex items-center justify-center transition-colors text-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('generateBaseList') || 'Generar Listado Base')}
            </button>
          </div>

          {/* Check Out Panel */}
          <div className="space-y-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {t('phase2CheckOut') || 'Fase 2: Check Out'} <span className="text-[10px] lowercase text-slate-500 font-normal block sm:inline">({t('crossUnits') || 'Cruce de Unidades'})</span>
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-300 focus:border-emerald-500 outline-none"
                />
                <div className="flex bg-slate-800 p-0.5 rounded-md border border-slate-700">
                  <button 
                    onClick={() => setCoMode('text')}
                    className={`p-1 rounded text-xs flex items-center transition-colors ${coMode === 'text' ? 'bg-[#0f172a] shadow text-emerald-400' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setCoMode('image')}
                    className={`p-1 rounded text-xs flex items-center transition-colors ${coMode === 'image' ? 'bg-[#0f172a] shadow text-emerald-400' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <FileImage className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            {coMode === 'text' ? (
              <div className="relative">
                <textarea 
                  className="input-area rounded-xl p-4 text-sm text-slate-300 resize-none h-32 focus:border-emerald-500 outline-none transition-colors w-full custom-scrollbar"
                  placeholder={t('pasteDataHereOut') || 'Pega aquí los datos de la tabla de salida (TSV/CSV)...'}
                  value={coText}
                  onChange={(e) => setCoText(e.target.value)}
                />
                {coText && (
                  <button 
                    onClick={() => setCoText('')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Limpiar texto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="input-area rounded-xl p-4 h-32 flex flex-col items-center justify-center text-center group cursor-pointer relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setCoFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-8 h-8 text-slate-600 group-hover:text-emerald-500 mb-2 transition-colors" />
                <p className="text-xs text-slate-400">
                  {coFile ? coFile.name : (t('clickOrDragImage') || 'Haz clic o arrastra una imagen aquí')}
                </p>
              </div>
            )}
            <button 
              disabled={isLoading || (coMode === 'text' ? !coText : !coFile)}
              onClick={handleCoSubmit}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors text-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('crossData') || 'Cruzar Datos (Ocupación)')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

