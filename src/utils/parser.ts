import { Reservation } from '../types';

export function parseTSV(text: string): Partial<Reservation>[] {
  const cleanText = text.replace(/\bselect\b[ \t]*/gi, '');
  const lines = cleanText.trim().split('\n');
  if (lines.length < 2) return [];

  // Determine separator: use tab if present in first line, otherwise comma
  const separator = lines[0].includes('\t') ? '\t' : ',';

  // Helper to split respecting quotes
  const splitLine = (line: string): string[] => {
    if (separator === '\t') return line.split('\t');
    
    // CSV split respecting double quotes
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const propIdx = headers.findIndex((h) => h === 'prop' || h === 'propiedad' || h === 'property');
  const unitIdx = headers.findIndex((h) => h === 'unit' || h === 'unidad' || h === 'room' || h === 'habitación' || h === 'habitacion');
  const checkInIdx = headers.findIndex((h) => h === 'check in' || h === 'checkin' || h === 'llegada' || h === 'entrada' || h === 'llegadas');
  const checkOutIdx = headers.findIndex((h) => h === 'check out' || h === 'checkout' || h === 'salida' || h === 'salidas');
  const guestIdx = headers.findIndex((h) => h === 'guest' || h === 'nombre' || h === 'name' || h === 'huésped' || h === 'huesped' || h === 'pasajero' || h === 'cliente' || h === 'huespedes' || h === 'huéspedes');

  const parsed: Partial<Reservation>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length < 3) continue;

    const getVal = (idx: number, fallbackIdx: number) => {
      let val = idx !== -1 && cols[idx] !== undefined ? cols[idx].trim() : cols[fallbackIdx] !== undefined ? cols[fallbackIdx].trim() : '';
      // Remove surrounding quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val;
    };

    parsed.push({
      prop: getVal(propIdx, 1),
      unit: getVal(unitIdx, 3),
      checkIn: getVal(checkInIdx, 4),
      checkOut: getVal(checkOutIdx, 6),
      guest: getVal(guestIdx, 7),
    });
  }

  return parsed;
}

export const formatPropertyName = (propName: string): string => {
  const upperProp = propName.trim().toUpperCase();
  
  if (upperProp === 'ETO') return 'EL TAJ OCEANFRONT';
  if (upperProp === 'ETB') return 'EL TAJ BEACHSIDE';
  if (upperProp === 'PP') return 'PORTO PLAYA';
  if (upperProp === 'MV') return 'MAYA VILLA';
  if (upperProp === 'VS') return 'VILLAS SACBE';
  if (upperProp === 'MG') return 'MAGIA BEACHSIDE';
  
  return upperProp;
};

export const formatGuestTag = (guestName: string): string => {
  let upperGuest = guestName.trim().toUpperCase();
  
  // Clean up typical delimiters that users might use around tags
  upperGuest = upperGuest.replace(/[\(\)\{\}]/g, '');

  if (
    upperGuest.startsWith('[VRBO]') ||
    upperGuest.startsWith('[ABB]') ||
    upperGuest.startsWith('[OWNER]') ||
    upperGuest.startsWith('[VIP]')
  ) {
    return upperGuest;
  }
  
  // Strip existing brackets temporarily if they only partially matched or were malformed
  const cleanGuest = upperGuest.replace(/[\[\]]/g, ' ');

  if (cleanGuest.includes('VRBO')) {
    return `[VRBO] ${cleanGuest.replace('VRBO', '').trim()}`.replace(/\s+/g, ' ').trim();
  } else if (cleanGuest.includes('ABB')) {
    return `[ABB] ${cleanGuest.replace('ABB', '').trim()}`.replace(/\s+/g, ' ').trim();
  } else if (cleanGuest.includes('OWNER')) {
    return `[OWNER] ${cleanGuest.replace('OWNER', '').trim()}`.replace(/\s+/g, ' ').trim();
  } else if (cleanGuest.includes('VIP')) {
    return `[VIP] ${cleanGuest.replace('VIP', '').trim()}`.replace(/\s+/g, ' ').trim();
  }
  
  return upperGuest;
};

export function processCheckInReservations(rawRows: Partial<Reservation>[]): Reservation[] {
  const reservations: Reservation[] = [];

  for (const row of rawRows) {
    const guest = (row.guest || '').trim();
    let upperGuest = formatGuestTag(guest);

    // Regla de Descarte 1: Nombres Excluidos Exactos
    const excludedExact = [
      'PHOTO SESION', 'PHOTO SESSION', 'SITE INSPECTION', 
      'MAINTENANCE BLOCK', 'RESERVATION BLOCK', 'BLOCK', 'VS BLOCK'
    ];
    if (excludedExact.includes(upperGuest) || upperGuest.includes('BLOCK') || upperGuest.includes('BLOQUEO')) {
      continue; // Descartar
    }

    // Regla de Descarte 2: Prefijo [EXT]
    if (upperGuest.startsWith('[EXT]')) {
      continue; // Descartar
    }

    let highlightCategory: 'green' | 'none' = 'none';

    // Regla de Etiquetado: Prefijos [VRBO], [ABB], [OWNER], [VIP]
    if (
      upperGuest.startsWith('[VRBO]') ||
      upperGuest.startsWith('[ABB]') ||
      upperGuest.startsWith('[OWNER]') ||
      upperGuest.startsWith('[VIP]')
    ) {
      highlightCategory = 'green';
    }

    reservations.push({
      id: crypto.randomUUID(),
      prop: formatPropertyName((row.prop || '').trim()),
      unit: (row.unit || '').trim().toUpperCase(),
      checkIn: row.checkIn || '',
      checkOut: row.checkOut || '',
      guest: upperGuest,
      isOccupied: false,
      comment: '',
      isReviewed: false,
      highlightCategory,
    });
  }

  return reservations;
}

export function applyCheckOutComparison(
  checkInList: Reservation[],
  checkOutRows: Partial<Reservation>[]
): Reservation[] {
  const checkOutExclusions = [
    'PHOTO SESION', 'PHOTO SESSION', 'SITE INSPECTION', 
    'MAINTENANCE BLOCK', 'RESERVATION BLOCK', 'BLOCK', 'VS BLOCK'
  ];

  const updatedList = [...checkInList];

  for (const coRow of checkOutRows) {
    const coUnit = (coRow.unit || '').trim().toUpperCase();
    const coGuest = (coRow.guest || '').trim();
    let upperCoGuest = formatGuestTag(coGuest);

    if (!coUnit) continue;

    // Excepcion: si el huesped en check out es de los excluidos, no se hace nada
    if (checkOutExclusions.includes(upperCoGuest) || upperCoGuest.includes('BLOCK') || upperCoGuest.includes('BLOQUEO')) {
      continue;
    }

    // Buscar coincidencia de unidad en Check In
    const matchingCheckIn = updatedList.find(res => res.unit === coUnit);
    if (matchingCheckIn) {
      matchingCheckIn.isOccupied = true;
    }
  }

  return updatedList;
}
