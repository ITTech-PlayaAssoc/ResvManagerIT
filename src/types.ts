export interface Reservation {
  id: string;
  prop: string;
  unit: string;
  checkIn: string;
  checkOut: string;
  guest: string;
  isOccupied: boolean;
  comment: string;
  isReviewed: boolean;
  highlightCategory?: 'green' | 'discard' | 'none'; // derived from guest name
}

export interface ProcessedList {
  id: string;
  date: string;
  reservations: Reservation[];
}
