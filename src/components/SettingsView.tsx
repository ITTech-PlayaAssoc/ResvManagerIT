import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { logout, loginWithGoogle } from '../lib/firebase';
import { LogOut, User, RefreshCcw, Globe, Check, Image as ImageIcon, Type, Save, Loader2, Upload } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { profile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [appTitle, setAppTitle] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAppTitle(settings.appTitle || '');
      setAppIcon(settings.appIcon || '');
    }
  }, [settings]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangeAccount = async () => {
    try {
      await logout();
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        appTitle: appTitle.trim(),
        appIcon: appIcon.trim()
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-200">{t('accountSettings')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('accountSettingsDesc')}</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Perfil del usuario actual */}
          <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="avatar" className="w-12 h-12 rounded-full border border-slate-700" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                <User className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-slate-200">{profile?.displayName || t('user')}</p>
              <p className="text-sm text-slate-400">{profile?.email}</p>
              <p className="text-xs text-emerald-400 capitalize mt-0.5">{profile?.role ? t(profile.role as any) : ''}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('sessionOptions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button 
                onClick={handleChangeAccount}
                className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <RefreshCcw className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">{t('changeAccount')}</p>
                  <p className="text-xs text-slate-400">{t('changeAccountDesc')}</p>
                </div>
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-red-400">{t('logout')}</p>
                  <p className="text-xs text-red-500/70">{t('logoutDesc')}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-200">{t('appPreferences')}</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4" /> {t('language')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: 'es', name: 'Español' },
                { id: 'en', name: 'English' },
                { id: 'fr', name: 'Français' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id as any)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${language === lang.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(profile?.role === 'admin' || profile?.role === 'owner') && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-slate-200">{t('appAppearance')}</h2>
            <p className="text-sm text-slate-400 mt-1">{t('appAppearanceDesc')}</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                  <Type className="w-4 h-4" /> {t('appTitle')}
                </label>
                <input
                  type="text"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder={t('appTitlePlaceholder')}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {t('appIconUrl')}
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="text"
                    value={appIcon}
                    onChange={(e) => setAppIcon(e.target.value)}
                    placeholder={t('appIconPlaceholder')}
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                  />
                  <span className="text-slate-500 text-sm font-medium uppercase">{t('or')}</span>
                  <label className="cursor-pointer flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 text-white transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{t('uploadIcon')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">{t('appIconDesc')}</p>
                {appIcon && (
                  <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 inline-block">
                    <p className="text-xs text-slate-400 mb-2">Vista previa:</p>
                    <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={appIcon} alt="Icon Preview" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveAppearance}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {t('saveAppearance')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
