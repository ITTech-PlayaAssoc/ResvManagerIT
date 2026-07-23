import { useState, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { ProcessedList, Reservation } from './types';
import { Sidebar } from './components/Sidebar';
import { InputForms } from './components/InputForms';
import { ReservationList } from './components/ReservationList';
import { Dashboard } from './components/Dashboard';
import { parseTSV, processCheckInReservations, applyCheckOutComparison } from './utils/parser';
import { generateUUID } from './utils/uuid';
import { Menu, Users, Loader2, X, Turtle } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { useSettings } from './contexts/SettingsContext';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { SettingsView } from './components/SettingsView';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

type View = 'dashboard' | 'listados' | 'usuarios' | 'configuracion';

export default function App() {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [lists, setLists] = useState<ProcessedList[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');

  const [isLoading, setIsLoading] = useState(false);

  const [undoData, setUndoData] = useState<{ listId: string; previousReservations: Reservation[] } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUndoableAction = (listId: string, currentReservations: Reservation[]) => {
    setUndoData({ listId, previousReservations: currentReservations });
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoData(null);
    }, 5000);
  };

  const handleUndo = async () => {
    if (!undoData) return;
    try {
      const listRef = doc(db, 'lists', undoData.listId);
      await updateDoc(listRef, { reservations: undoData.previousReservations });
      setUndoData(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Default dates: tomorrow
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [checkInDate, setCheckInDate] = useState(tomorrowStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'lists'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcessedList));
      setLists(data);
      
      setCurrentListId(prev => {
        if (!prev && data.length > 0) {
          return data[0].id;
        }
        return prev;
      });
    });
    
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0f172a]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  const isSupervisor = profile?.role === 'supervisor';

  const currentList = lists.find(l => l.id === currentListId);

  const handleNewList = () => {
    if (!isAdmin) return;
    setCurrentListId(null);
    setCheckInDate(tomorrowStr);
    setCheckOutDate(tomorrowStr);
    setActiveView('listados');
  };

  const handleDeleteList = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'lists', id));
      if (currentListId === id) {
        setCurrentListId(null);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const processImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/parse-image', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to parse image');
    }
    return res.json();
  };

  const handleProcessCheckIn = async (data: string, isImage: boolean, file?: File) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      let rawRows: Partial<Reservation>[] = [];
      if (isImage && file) {
        rawRows = await processImage(file);
      } else {
        rawRows = parseTSV(data);
      }

      const processed = processCheckInReservations(rawRows);
      
      const newList: ProcessedList = {
        id: generateUUID(),
        date: new Date(checkInDate + 'T12:00:00Z').toISOString(),
        reservations: processed
      };

      await setDoc(doc(db, 'lists', newList.id), newList);
      setCurrentListId(newList.id);
    } catch (e: any) {
      alert(`Error procesando Check In: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessCheckOut = async (data: string, isImage: boolean, file?: File) => {
    if (!isAdmin) return;
    if (!currentList) {
      alert("Por favor genera primero el listado de Check In.");
      return;
    }
    setIsLoading(true);
    try {
      let rawRows: Partial<Reservation>[] = [];
      if (isImage && file) {
        rawRows = await processImage(file);
      } else {
        rawRows = parseTSV(data);
      }

      const listRef = doc(db, 'lists', currentList.id);
      const listSnap = await getDoc(listRef);
      if (!listSnap.exists()) return;
      const listData = listSnap.data() as ProcessedList;

      const updatedReservations = applyCheckOutComparison(listData.reservations, rawRows);
      
      await updateDoc(listRef, { reservations: updatedReservations });
    } catch (e: any) {
      alert(`Error procesando Check Out: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReservation = async (id: string, updates: Partial<Reservation>) => {
    if (!isAdmin && !isSupervisor) return;
    if (!currentList) return;
    try {
      const listRef = doc(db, 'lists', currentList.id);
      const listSnap = await getDoc(listRef);
      if (!listSnap.exists()) return;
      const listData = listSnap.data() as ProcessedList;

      triggerUndoableAction(currentList.id, listData.reservations);

      const updatedReservations = listData.reservations.map(r => r.id === id ? { ...r, ...updates } : r);
      await updateDoc(listRef, { reservations: updatedReservations });
    } catch (e: any) {
      console.error(e);
    }
  };

  const deleteReservation = async (id: string) => {
    if (!isAdmin) return;
    if (!currentList) return;
    try {
      const listRef = doc(db, 'lists', currentList.id);
      const listSnap = await getDoc(listRef);
      if (!listSnap.exists()) return;
      const listData = listSnap.data() as ProcessedList;

      triggerUndoableAction(currentList.id, listData.reservations);

      const updatedReservations = listData.reservations.filter(r => r.id !== id);
      await updateDoc(listRef, { reservations: updatedReservations });
    } catch (e: any) {
      console.error(e);
    }
  };

  const reorderReservations = async (sourceId: string, targetId: string) => {
    if (!isAdmin || !currentList) return;
    try {
      const listRef = doc(db, 'lists', currentList.id);
      const listSnap = await getDoc(listRef);
      if (!listSnap.exists()) return;
      const listData = listSnap.data() as ProcessedList;

      triggerUndoableAction(currentList.id, listData.reservations);

      const updatedReservations = [...listData.reservations];
      const sourceIndex = updatedReservations.findIndex(r => r.id === sourceId);
      const targetIndex = updatedReservations.findIndex(r => r.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return;

      const [movedItem] = updatedReservations.splice(sourceIndex, 1);
      updatedReservations.splice(targetIndex, 0, movedItem);

      await updateDoc(listRef, { reservations: updatedReservations });
    } catch (e: any) {
      console.error(e);
    }
  };

  const addReservation = async (reservation: Reservation) => {
    if (!isAdmin) return;
    if (!currentList) return;
    try {
      const listRef = doc(db, 'lists', currentList.id);
      const listSnap = await getDoc(listRef);
      if (!listSnap.exists()) return;
      const listData = listSnap.data() as ProcessedList;

      triggerUndoableAction(currentList.id, listData.reservations);

      const updatedReservations = [reservation, ...listData.reservations];
      await updateDoc(listRef, { reservations: updatedReservations });
    } catch (e: any) {
      console.error(e);
    }
  };

  const activeReservations = currentList?.reservations.filter(r => !r.isReviewed) || [];
  const reviewedReservations = currentList?.reservations.filter(r => r.isReviewed) || [];

  return (
    <div className="flex h-[100dvh] bg-[#0f172a] font-sans text-slate-200 transition-colors">
      <Sidebar 
        lists={lists} 
        currentListId={currentListId} 
        onSelectList={(id) => { setCurrentListId(id); setIsSidebarOpen(false); setActiveView('listados'); }} 
        onNewList={() => { handleNewList(); setIsSidebarOpen(false); }}
        onDeleteList={handleDeleteList}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeView={activeView}
        onSelectView={(view) => { setActiveView(view); setIsSidebarOpen(false); }}
        isAdmin={isAdmin}
      />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
        <header className="sticky top-0 z-10 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{settings.appTitle || 'RESV-MANAGER'}</h1>
              <p className="text-xs text-slate-400 mt-1 capitalize">
                {activeView === 'listados' ? (currentList 
                  ? `${t('activeList')}: ${format(new Date(currentList.date), 'dd MMMM yyyy, HH:mm')}`
                  : t('createNewList')) : t(activeView as any)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{profile?.displayName}</p>
                <p className="text-[10px] text-emerald-400 capitalize">{profile?.role ? t(profile.role as any) : ''}</p>
              </div>
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="avatar" className="w-8 h-8 rounded-full border border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                  <Users className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-6xl w-full mx-auto flex flex-col flex-1">
          {activeView === 'listados' && isAdmin && (
            <>
              {/* Inputs Section */}
              <InputForms 
                checkInDate={checkInDate}
                setCheckInDate={setCheckInDate}
                checkOutDate={checkOutDate}
                setCheckOutDate={setCheckOutDate}
                onProcessCheckIn={handleProcessCheckIn}
                onProcessCheckOut={handleProcessCheckOut}
                isLoading={isLoading}
              />

              {/* Data Section */}
              {currentList && (
                <div className="flex-1 flex flex-col md:overflow-hidden space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <ReservationList 
                    title={t('activeReservations')}
                    reservations={activeReservations}
                    onToggleReview={(id, rev) => updateReservation(id, { isReviewed: rev })}
                    onUpdateComment={(id, com) => updateReservation(id, { comment: com })}
                    onToggleOccupancy={(id) => {
                      const res = currentList.reservations.find(r => r.id === id);
                      if (res) updateReservation(id, { isOccupied: !res.isOccupied });
                    }}
                    onDeleteReservation={deleteReservation}
                    onUpdateReservation={updateReservation}
                    onAddReservation={addReservation}
                    onReorderReservations={reorderReservations}
                  />

                  <div className="mt-auto flex-shrink-0">
                    <ReservationList 
                      title={t('reviewedSection')}
                      isReviewedList={true}
                      reservations={reviewedReservations}
                      onToggleReview={(id, rev) => updateReservation(id, { isReviewed: rev })}
                      onUpdateComment={(id, com) => updateReservation(id, { comment: com })}
                      onToggleOccupancy={(id) => {
                        const res = currentList.reservations.find(r => r.id === id);
                        if (res) updateReservation(id, { isOccupied: !res.isOccupied });
                      }}
                      onDeleteReservation={deleteReservation}
                      onUpdateReservation={updateReservation}
                      onReorderReservations={reorderReservations}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === 'dashboard' && (
            <Dashboard lists={lists} />
          )}

          {activeView === 'usuarios' && isAdmin && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              <UserManagement />
            </div>
          )}

          {activeView === 'configuracion' && (
            <div className="flex-1 flex flex-col pt-4">
              <SettingsView />
            </div>
          )}

          {!isAdmin && activeView === 'listados' && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              {t('noAdminPermission')}
            </div>
          )}
        </div>

        {undoData && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 z-50">
            <span className="text-sm font-medium">Acción realizada</span>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
              <button
                onClick={handleUndo}
                className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Deshacer
              </button>
              <button
                onClick={() => {
                  setUndoData(null);
                  if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                }}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <Turtle className="w-6 h-6 text-emerald-500/20 fixed bottom-4 right-4 z-50 pointer-events-none" />
      </main>
    </div>
  );
}
