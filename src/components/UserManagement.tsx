import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Shield, ShieldAlert, User as UserIcon, Trash2 } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'supervisor') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Error al actualizar el rol. Verifica tus permisos.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm(t('confirmDeleteUser' as any))) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error al eliminar el usuario. Verifica tus permisos.");
      }
    }
  };

  if (loading) return <div className="text-center p-8 text-slate-500">{t('loadingUsers')}</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">{t('userManagement')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('userManagementDesc')}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-xs uppercase text-slate-500 font-semibold">
            <tr>
              <th className="px-6 py-4">{t('user')}</th>
              <th className="px-6 py-4">{t('email')}</th>
              <th className="px-6 py-4">{t('currentUserRole')}</th>
              <th className="px-6 py-4 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName || t('user')} className="w-8 h-8 rounded-full border border-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-medium text-slate-300">{u.displayName || t('unknown')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {u.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border
                    ${u.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                    ${u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                    ${u.role === 'supervisor' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                  `}>
                    {u.role === 'owner' && <Shield className="w-3 h-3 mr-1" />}
                    {u.role ? t(u.role as any) : ''}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  {u.role !== 'owner' ? (
                    <>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin' | 'supervisor')}
                        className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full max-w-[120px] p-2"
                      >
                        <option value="supervisor">{t('supervisor')}</option>
                        <option value="admin">{t('admin')}</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(u.uid)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                        title={t('deleteUser' as any)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 italic">{t('ownerImmutable')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500">
            {t('noUsersFound')}
          </div>
        )}
      </div>
    </div>
  );
};
