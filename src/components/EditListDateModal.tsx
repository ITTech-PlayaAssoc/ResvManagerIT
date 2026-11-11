import React, { useState, useEffect } from 'react';
import { ProcessedList } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { es, enUS, fr } from 'date-fns/locale';
import { Calendar, X, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EditListDateModalProps {
  list: ProcessedList | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveDate: (listId: string, newDateStr: string) => Promise<void> | void;
}

export const EditListDateModal: React.FC<EditListDateModalProps> = ({
  list,
  isOpen,
  onClose,
  onSaveDate
}) => {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocale = () => {
    if (language === 'es') return es;
    if (language === 'fr') return fr;
    return enUS;
  };

  useEffect(() => {
    if (list && isOpen) {
      try {
        const d = parseISO(list.date);
        if (isValid(d)) {
          setSelectedDate(format(d, 'yyyy-MM-dd'));
        } else {
          setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
        }
      } catch {
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      }
      setError(null);
      setIsSaving(false);
    }
  }, [list, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !list) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Por favor selecciona una fecha válida');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSaveDate(list.id, selectedDate);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la fecha');
    } finally {
      setIsSaving(false);
    }
  };

  let formattedCurrentDate = '';
  try {
    const d = parseISO(list.date);
    if (isValid(d)) {
      formattedCurrentDate = format(d, 'dd MMMM yyyy', { locale: getLocale() });
    }
  } catch {
    formattedCurrentDate = list.date;
  }

  let formattedPreviewDate = '';
  if (selectedDate) {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (isValid(d)) {
          formattedPreviewDate = format(d, 'dd MMMM yyyy', { locale: getLocale() });
        }
      }
    } catch {
      formattedPreviewDate = selectedDate;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !isSaving && onClose()}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title={t('cancel')}
          disabled={isSaving}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-6 h-6" />
        </div>

        <h3 className="text-base font-semibold text-white text-center mb-1">
          {t('changeListDate')}
        </h3>

        <p className="text-xs text-slate-400 text-center mb-4">
          {t('currentDate')}: <span className="text-slate-200 font-medium">{formattedCurrentDate}</span>
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t('newListDate')}
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isSaving}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3.5 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
            />
            {formattedPreviewDate && (
              <p className="text-[11px] text-emerald-400 mt-1.5 capitalize">
                → {formattedPreviewDate}
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            {t('changeDateNotice')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedDate}
              className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saveDate')}...</span>
                </>
              ) : (
                <span>{t('saveDate')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
