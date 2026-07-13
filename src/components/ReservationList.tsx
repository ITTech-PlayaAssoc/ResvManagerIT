import React, { useState } from 'react';
import { Reservation } from '../types';
import { Check, MessageSquare, Trash2, Edit2, UserPlus, Plus, X, Save, GripVertical, LayoutGrid, List, FileText } from 'lucide-react';
import { formatGuestTag, parseTSV, formatPropertyName } from '../utils/parser';
import { generateUUID } from '../utils/uuid';

interface ReservationListProps {
  reservations: Reservation[];
  onToggleReview: (id: string, reviewed: boolean) => void;
  onUpdateComment: (id: string, comment: string) => void;
  onToggleOccupancy: (id: string) => void;
  title: string;
  isReviewedList?: boolean;
  onDeleteReservation?: (id: string) => void;
  onUpdateReservation?: (id: string, updates: Partial<Reservation>) => void;
  onAddReservation?: (res: Reservation) => void;
  onReorderReservations?: (sourceId: string, targetId: string) => void;
}

export const ReservationList: React.FC<ReservationListProps> = ({
  reservations,
  onToggleReview,
  onUpdateComment,
  onToggleOccupancy,
  title,
  isReviewedList = false,
  onDeleteReservation,
  onUpdateReservation,
  onAddReservation,
  onReorderReservations
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Reservation>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [importText, setImportText] = useState('');
  const [addForm, setAddForm] = useState<Partial<Reservation>>({
    prop: '', unit: '', guest: '', checkIn: '', checkOut: '', isOccupied: false, isReviewed: false, comment: ''
  });

  const isList = viewMode === 'list';
  const tableClass = isList ? 'w-full text-left border-separate border-spacing-y-2 min-w-[900px] table' : 'w-full text-left border-separate border-spacing-y-3 md:border-spacing-y-2 md:min-w-[900px] block md:table';
  const theadClass = isList ? 'table-header-group sticky top-0 bg-[#0f172a] z-10 text-xs text-slate-500 uppercase font-bold tracking-wider' : 'hidden md:table-header-group sticky top-0 bg-[#0f172a] z-10 text-xs text-slate-500 uppercase font-bold tracking-wider';
  const tbodyClass = isList ? 'table-row-group text-sm' : 'block md:table-row-group text-sm';
  const trClass = isList ? 'table-row' : 'block md:table-row p-4 md:p-0';
  const trClassHover = isList ? 'table-row group' : 'block md:table-row p-4 md:p-0 group';
  const tdClass = isList ? 'table-cell py-2 px-1' : 'block md:table-cell py-1 md:py-2 px-1';
  const tdClassProp = isList ? 'table-cell py-2 pl-4 max-w-[200px]' : 'block md:table-cell md:py-3 md:pl-4 text-slate-400 max-w-[200px]';
  const labelClass = isList ? 'hidden' : 'md:hidden text-[10px] uppercase font-bold text-slate-500';

  const handleEditClick = (res: Reservation) => {
    setEditingId(res.id);
    setEditForm(res);
  };

  const handleSaveEdit = () => {
    if (editingId && onUpdateReservation) {
      onUpdateReservation(editingId, {
        ...editForm,
        prop: editForm.prop ? formatPropertyName(editForm.prop) : '',
        guest: editForm.guest ? formatGuestTag(editForm.guest) : '',
        unit: editForm.unit ? editForm.unit.trim().toUpperCase() : ''
      });
    }
    setEditingId(null);
  };

  const handleSaveAdd = () => {
    if (onAddReservation && addForm.prop && addForm.unit) {
      onAddReservation({
        id: generateUUID(),
        prop: formatPropertyName(addForm.prop || ''),
        unit: (addForm.unit || '').trim().toUpperCase(),
        guest: addForm.guest ? formatGuestTag(addForm.guest) : '',
        checkIn: addForm.checkIn || '',
        checkOut: addForm.checkOut || '',
        isOccupied: addForm.isOccupied || false,
        isReviewed: false,
        comment: addForm.comment || ''
      });
      setIsAdding(false);
      setAddForm({ prop: '', unit: '', guest: '', checkIn: '', checkOut: '', isOccupied: false, isReviewed: false, comment: '' });
      setImportText('');
    }
  };

  const handleProcessImport = () => {
    if (!importText.trim()) return;
    let textToParse = importText;
    const lines = textToParse.trim().split('\n');
    if (lines.length === 1) {
      // Si pegan una sola fila sin cabeceras, usamos las posiciones por defecto (1=prop, 3=unit, 4=in, 6=out, 7=guest)
      textToParse = "Col0\tCol1\tCol2\tCol3\tCol4\tCol5\tCol6\tCol7\n" + textToParse;
    }
    const parsed = parseTSV(textToParse);
    
    if (parsed.length > 0 && onAddReservation) {
      let added = 0;
      parsed.forEach(row => {
        if (row.prop && row.unit) {
          onAddReservation({
            id: generateUUID(),
            prop: formatPropertyName(row.prop || ''),
            unit: (row.unit || '').trim().toUpperCase(),
            guest: row.guest ? formatGuestTag(row.guest) : '',
            checkIn: row.checkIn || '',
            checkOut: row.checkOut || '',
            isOccupied: false,
            isReviewed: false,
            comment: ''
          });
          added++;
        }
      });
      
      if (added > 0) {
        setIsAdding(false);
        setImportText('');
        setAddForm({ prop: '', unit: '', guest: '', checkIn: '', checkOut: '', isOccupied: false, isReviewed: false, comment: '' });
      } else {
        alert("No se encontraron propiedades y unidades válidas en el texto extraído.");
      }
    } else {
      alert("No se pudieron extraer datos válidos. Comprueba el formato de la tabla.");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!onReorderReservations) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the UI to update the dragging element's visual state if needed
    setTimeout(() => {
      e.target && (e.target as HTMLElement).classList.add('opacity-50');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!onReorderReservations || draggedId === id) return;
    setDragOverId(id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverId(null);
    e.target && (e.target as HTMLElement).classList.remove('opacity-50');
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!onReorderReservations || !draggedId || draggedId === targetId) return;
    onReorderReservations(draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  };

  if (reservations.length === 0 && !isAdding && isReviewedList) return null;

  return (
    <div className="mb-8 flex-1 flex flex-col md:overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isReviewedList ? 'bg-slate-500' : 'bg-emerald-500'}`}></span>
          {title}
        </h3>
        <div className="flex items-center gap-4">
          <div className="md:hidden flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5">
            <button 
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded ${!isList ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${isList ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              title="Vista de Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">{reservations.length} elementos</div>
          {!isReviewedList && onAddReservation && (
            <button 
              onClick={() => setIsAdding(true)}
              className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          )}
        </div>
      </div>
      <div className={`flex-1 md:overflow-y-auto ${isList ? 'overflow-x-auto' : 'overflow-x-hidden'} md:overflow-x-auto custom-scrollbar md:pr-2`}>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className="pb-2 pl-4">Prop</th>
              <th className="pb-2">Unit</th>
              <th className="pb-2">Check In / Out</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Comentario</th>
              <th className="pb-2 text-center">Rev.</th>
              <th className="pb-2 pr-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {isAdding && (
              <>
                <tr className={`bg-slate-800/40 border border-emerald-500/20 ${trClass}`}>
                  <td colSpan={7} className={`${tdClass} px-4 pt-4`}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        Extracción Rápida (Pegar Tabla)
                      </div>
                      <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:border-emerald-500 outline-none resize-none h-16 custom-scrollbar"
                        placeholder="Pega aquí una o varias filas de Excel/TSV para extraer y añadir automáticamente..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                      />
                      <div className="flex justify-end mt-1 mb-3">
                        <button 
                          onClick={handleProcessImport}
                          disabled={!importText.trim()}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors"
                        >
                          Extraer y Añadir
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1"></div>
                        <span>O añade manualmente</span>
                        <div className="h-px bg-slate-700 flex-1"></div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className={`bg-slate-800/80 border border-emerald-500/50 rounded-b-lg ${trClass}`}>
                  <td className={tdClass}>
                  <input type="text" placeholder="Propiedad" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs mb-1 focus:border-emerald-500 outline-none" value={addForm.prop} onChange={e => setAddForm({...addForm, prop: e.target.value})} />
                  <input type="text" placeholder="Etiqueta (Ej. [Owner])" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={addForm.guest} onChange={e => setAddForm({...addForm, guest: e.target.value})} />
                </td>
                <td className={tdClass}>
                  <input type="text" placeholder="Unidad" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})} />
                </td>
                <td className={`${tdClass} text-xs`}>
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 mb-1 focus:border-emerald-500 outline-none" value={addForm.checkIn} onChange={e => {
                    const newCheckIn = e.target.value;
                    let newCheckOut = addForm.checkOut;
                    if (newCheckIn && newCheckOut && newCheckIn > newCheckOut) {
                      newCheckOut = newCheckIn;
                    }
                    setAddForm({...addForm, checkIn: newCheckIn, checkOut: newCheckOut});
                  }} />
                  <input type="date" min={addForm.checkIn} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 focus:border-emerald-500 outline-none" value={addForm.checkOut} onChange={e => setAddForm({...addForm, checkOut: e.target.value})} />
                </td>
                <td className={tdClass}>
                  <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none text-slate-300" value={addForm.isOccupied ? 'true' : 'false'} onChange={e => setAddForm({...addForm, isOccupied: e.target.value === 'true'})}>
                    <option value="false">Desocupado</option>
                    <option value="true">Ocupado</option>
                  </select>
                </td>
                <td className={tdClass}>
                  <input type="text" placeholder="Comentario..." className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={addForm.comment} onChange={e => setAddForm({...addForm, comment: e.target.value})} />
                </td>
                <td className={`${tdClass} text-center text-slate-500 text-xs`}>
                  -
                </td>
                <td className={`${tdClass} md:pr-4 text-right`}>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={handleSaveAdd} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setIsAdding(false)} className="p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
              </>
            )}

            {reservations.length === 0 && !isAdding && (
              <tr className={trClass}>
                <td colSpan={7} className={`${tdClass} py-8 text-center text-slate-500`}>
                  No hay reservas activas en este momento.
                </td>
              </tr>
            )}

            {reservations.map(res => {
              const isEditing = editingId === res.id;
              
              // Extract prefix for tag if present
              let prefix = '';
              let tagClass = 'tag-default';
              const match = res.guest.match(/^\[([^\]]+)\]/);
              if (match) {
                prefix = match[1].trim().toUpperCase();
                if (prefix === 'VIP') tagClass = 'tag-vip';
                else if (prefix === 'OWNER') tagClass = 'tag-owner';
                else if (prefix === 'ABB') tagClass = 'tag-abb';
                else if (prefix === 'VRBO') tagClass = 'tag-vrbo';
              }

              const rowClasses = [
                'rounded-lg transition-all',
                !!onReorderReservations ? 'cursor-grab active:cursor-grabbing' : '',
                isEditing ? 'bg-slate-800/80 border border-emerald-500/50' : 
                isReviewedList ? 'opacity-60 bg-slate-900/40 border border-slate-800' : 'bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50',
              ].join(' ');

              if (isEditing) {
                return (
                  <tr key={res.id} className={`${rowClasses} ${trClass}`}>
                    <td className={tdClass}>
                      <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs mb-1 focus:border-emerald-500 outline-none" value={editForm.prop} onChange={e => setEditForm({...editForm, prop: e.target.value})} />
                      <input type="text" placeholder="Etiqueta" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={editForm.guest} onChange={e => setEditForm({...editForm, guest: e.target.value})} />
                    </td>
                    <td className={tdClass}>
                      <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} />
                    </td>
                    <td className={`${tdClass} text-xs`}>
                      <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 mb-1 focus:border-emerald-500 outline-none" value={editForm.checkIn} onChange={e => {
                        const newCheckIn = e.target.value;
                        let newCheckOut = editForm.checkOut;
                        if (newCheckIn && newCheckOut && newCheckIn > newCheckOut) {
                          newCheckOut = newCheckIn;
                        }
                        setEditForm({...editForm, checkIn: newCheckIn, checkOut: newCheckOut});
                      }} />
                      <input type="date" min={editForm.checkIn} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 focus:border-emerald-500 outline-none" value={editForm.checkOut} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} />
                    </td>
                    <td className={tdClass}>
                      <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none text-slate-300" value={editForm.isOccupied ? 'true' : 'false'} onChange={e => setEditForm({...editForm, isOccupied: e.target.value === 'true'})}>
                        <option value="false">Desocupado</option>
                        <option value="true">Ocupado</option>
                      </select>
                    </td>
                    <td className={tdClass}>
                      <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none" value={editForm.comment} onChange={e => setEditForm({...editForm, comment: e.target.value})} />
                    </td>
                    <td className={`${tdClass} text-center text-slate-500 text-xs`}>
                      -
                    </td>
                    <td className={`${tdClass} md:pr-4 text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={res.id} 
                  className={`${rowClasses} ${trClassHover} ${dragOverId === res.id ? 'border-t-2 border-t-emerald-500' : ''}`}
                  draggable={!!onReorderReservations}
                  onDragStart={(e) => handleDragStart(e, res.id)}
                  onDragOver={(e) => handleDragOver(e, res.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, res.id)}
                >
                  <td className={tdClassProp}>
                    <div className="flex items-center gap-2">
                      {!!onReorderReservations && (
                        <GripVertical className="w-4 h-4 text-slate-600 hidden md:block cursor-grab active:cursor-grabbing" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-300 truncate">{res.prop}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdClass} font-bold text-slate-200`}>
                    <div className="flex items-center gap-2">
                      <div className={labelClass}>Unidad</div>
                      {res.unit}
                      {prefix && (
                        <span className={`${tagClass} text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}>
                          {prefix}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${tdClass} text-slate-400 text-xs mb-3 md:mb-0`}>
                    <div className={`${labelClass} mb-0.5`}>Fechas</div>
                    {res.checkIn} - {res.checkOut}
                  </td>
                  <td className={`${tdClass} mb-3 md:mb-0`}>
                    <div className="flex items-center gap-2">
                      <div className={labelClass}>Estado</div>
                      <button
                        onClick={() => onToggleOccupancy(res.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors focus:outline-none ${
                          res.isOccupied ? 'status-busy hover:bg-red-500/20' : 'status-free hover:bg-blue-500/20'
                        }`}
                      >
                        {res.isOccupied ? 'Ocupado' : 'Desocupado'}
                      </button>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600 hidden md:block" />
                      <input
                        type="text"
                        value={res.comment}
                        onChange={(e) => onUpdateComment(res.id, e.target.value)}
                        placeholder="Añadir nota..."
                        className="bg-transparent border-b border-transparent hover:border-slate-700 text-xs focus:border-emerald-500 outline-none w-full md:pr-4 text-slate-300 placeholder-slate-600 transition-colors py-1 md:py-0"
                      />
                    </div>
                  </td>
                  <td className={`${tdClass} text-left md:text-center mt-2 md:mt-0`}>
                    <div className="flex items-center gap-3 md:justify-center">
                      <div className={labelClass}>Revisado</div>
                      <button
                        onClick={() => onToggleReview(res.id, !res.isReviewed)}
                        className={`w-5 h-5 md:mx-auto rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500
                        ${res.isReviewed 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-slate-900 border-slate-700 text-transparent hover:border-emerald-500/50'}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className={`${tdClass} md:pr-4 text-left md:text-right border-t border-slate-700/30 md:border-t-0 mt-2 md:mt-0 pt-3 md:pt-0`}>
                    <div className="flex items-center justify-start md:justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {onUpdateReservation && (
                        <button onClick={() => handleEditClick(res)} className="flex items-center p-1.5 md:p-1 bg-slate-700/50 md:bg-transparent text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="md:hidden text-xs ml-1 font-medium">Editar</span>
                        </button>
                      )}
                      {onDeleteReservation && (
                        <button onClick={() => onDeleteReservation(res.id)} className="flex items-center p-1.5 md:p-1 bg-slate-700/50 md:bg-transparent text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="md:hidden text-xs ml-1 font-medium">Eliminar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
