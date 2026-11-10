import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Home, 
  PartyPopper, 
  Settings, 
  Bot, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  AlertCircle,
  Copy,
  CheckCircle2,
  Wifi,
  Globe,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Phone
} from 'lucide-react';

// Configuration Initial Data
const INITIAL_CONFIG = {
  posadaName: 'BARE BARE POSADA SPA RESTAURANT C.A.',
  currencySymbol: '€',
  singleRate: 50, // Euros for 1 guest
  baseCoupleRate: 80, // Euros for 2 guests
  extraGuestRate: 20, // Euros per extra guest per night
  rooms: [
    { id: '101', name: 'Habitación 101 - Suite Presidencial', capacity: 4, nightlyRate: 120, type: 'Suite' },
    { id: '102', name: 'Habitación 102 - Duplex Familiar', capacity: 8, nightlyRate: 200, type: 'Duplex' },
    { id: '103', name: 'Habitación 103 - Vista al Jardín', capacity: 3, nightlyRate: 80, type: 'Estándar' },
    { id: '104', name: 'Habitación 104 - Rincón Romántico', capacity: 2, nightlyRate: 80, type: 'Romántica' },
    { id: '105', name: 'Habitación 105 - Cabaña Rústica Duplex', capacity: 6, nightlyRate: 160, type: 'Duplex' }
  ]
};

// Initial Mock Bookings Data
const INITIAL_ROOM_BOOKINGS = [
  {
    id: 'res-1',
    roomId: '101',
    guestName: 'Carlos Mendoza',
    companionNames: 'María Mendoza, Ana Mendoza',
    idNumber: 'V-18.452.910',
    phone: '+58 412 9876543',
    paxCount: 3,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    totalAmount: 240,
    status: 'Confirmada',
    notes: 'Solicita cuna de bebé'
  },
  {
    id: 'res-2',
    roomId: '104',
    guestName: 'Valeria Gómez',
    companionNames: 'Roberto Silva',
    idNumber: 'E-84.120.399',
    phone: '+58 414 5551234',
    paxCount: 2,
    checkIn: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    totalAmount: 160,
    status: 'Confirmada',
    notes: 'Aniversario de bodas'
  }
];

const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    title: 'Boda Civil Familia Pérez',
    eventType: 'Boda',
    date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    paxCount: 45,
    contactName: 'Elena Pérez',
    contactPhone: '+58 414 1234567',
    notes: 'Montaje de sillas en Patio Central y Brindis'
  }
];

export default function App() {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, weekly, monthly, events, admin, api
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'guest'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('room'); // room, event

  // Read Core Data from localStorage if available, or fall back to Initial Mock Data
  const [posadaConfig, setPosadaConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('posada_config');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch (e) {
      return INITIAL_CONFIG;
    }
  });

  const [roomBookings, setRoomBookings] = useState(() => {
    try {
      const saved = localStorage.getItem('posada_room_bookings');
      return saved ? JSON.parse(saved) : INITIAL_ROOM_BOOKINGS;
    } catch (e) {
      return INITIAL_ROOM_BOOKINGS;
    }
  });

  const [eventBookings, setEventBookings] = useState(() => {
    try {
      const saved = localStorage.getItem('posada_event_bookings');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch (e) {
      return INITIAL_EVENTS;
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('posada_room_bookings', JSON.stringify(roomBookings));
    } catch (e) {
      console.warn('Error saving room bookings:', e);
    }
  }, [roomBookings]);

  useEffect(() => {
    try {
      localStorage.setItem('posada_event_bookings', JSON.stringify(eventBookings));
    } catch (e) {
      console.warn('Error saving event bookings:', e);
    }
  }, [eventBookings]);

  useEffect(() => {
    try {
      localStorage.setItem('posada_config', JSON.stringify(posadaConfig));
    } catch (e) {
      console.warn('Error saving config:', e);
    }
  }, [posadaConfig]);

  // Listen to Broadcast Channel & Storage events across tabs/windows for live real-time sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'posada_room_bookings' && e.newValue) {
        try {
          const updatedBookings = JSON.parse(e.newValue);
          setRoomBookings(updatedBookings);
          showToast('🔔 ¡Nueva reserva sincronizada en tiempo real!', 'success');
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Read URL query parameters on initial page load (for cloud / Google Drive / public hosting)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const modeParam = searchParams.get('mode');
      const roomParam = searchParams.get('room') || searchParams.get('hab');

      if (modeParam === 'guest' || roomParam) {
        setViewMode('guest');
        if (roomParam) {
          setGuestForm(prev => ({ ...prev, roomId: roomParam }));
        }
      }
    } catch (e) {
      console.warn('Error reading URL parameters:', e);
    }
  }, []);

  // Booking detail view modal for Range Matrix
  const [matrixDetailModal, setMatrixDetailModal] = useState(null);

  // Guest Public Form State & Confirmation State
  const [guestSuccessBooking, setGuestSuccessBooking] = useState(null);
  const [guestForm, setGuestForm] = useState({
    roomId: INITIAL_CONFIG.rooms[0]?.id || '101',
    guestName: '',
    idNumber: '',
    phone: '',
    companionNames: '',
    paxCount: 2,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: ''
  });
  const [guestConflict, setGuestConflict] = useState(null);

  // Link Generator Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkRoomId, setLinkRoomId] = useState('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Editing State
  const [editingItem, setEditingItem] = useState(null);

  // Conflict / Recommendation State
  const [bookingConflict, setBookingConflict] = useState(null);

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState(null);

  // Selected Day state for Monthly Detail Legend
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Date Filters
  const [rangeStartDate, setRangeStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rangeEndDate, setRangeEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [monthlyYearMonth, setMonthlyYearMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Admin New Room State
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    capacity: 2,
    nightlyRate: 80,
    type: 'Estándar'
  });

  // Room Booking Form State (Admin)
  const [roomForm, setRoomForm] = useState({
    roomId: INITIAL_CONFIG.rooms[0]?.id || '101',
    guestName: '',
    companionNames: '',
    idNumber: '',
    phone: '',
    paxCount: 2,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: ''
  });

  // Event Booking Form State
  const [eventForm, setEventForm] = useState({
    eventType: 'Boda',
    date: new Date().toISOString().split('T')[0],
    contactName: '',
    contactPhone: '',
    paxCount: 30
  });

  // Calculate pricing & nights automatically for Admin Form
  const roomCalculations = useMemo(() => {
    if (!roomForm.checkIn || !roomForm.checkOut) return { nights: 0, nightlyRate: 0, totalAmount: 0 };

    const start = new Date(roomForm.checkIn);
    const end = new Date(roomForm.checkOut);
    const diffTime = end - start;
    const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const pax = Number(roomForm.paxCount) || 1;
    let nightlyRate = 0;

    if (pax === 1) {
      nightlyRate = posadaConfig.singleRate || 50;
    } else {
      const baseCouple = posadaConfig.baseCoupleRate || 80;
      const extraGuests = Math.max(0, pax - 2);
      const extraCost = extraGuests * (posadaConfig.extraGuestRate || 20);
      nightlyRate = baseCouple + extraCost;
    }

    const totalAmount = nights * nightlyRate;

    return { nights, nightlyRate, totalAmount };
  }, [roomForm.checkIn, roomForm.checkOut, roomForm.paxCount, posadaConfig]);

  // Calculate pricing for Guest Public Form
  const guestCalculations = useMemo(() => {
    if (!guestForm.checkIn || !guestForm.checkOut) return { nights: 0, nightlyRate: 0, totalAmount: 0 };

    const start = new Date(guestForm.checkIn);
    const end = new Date(guestForm.checkOut);
    const diffTime = end - start;
    const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const pax = Number(guestForm.paxCount) || 1;
    let nightlyRate = 0;

    if (pax === 1) {
      nightlyRate = posadaConfig.singleRate || 50;
    } else {
      const baseCouple = posadaConfig.baseCoupleRate || 80;
      const extraGuests = Math.max(0, pax - 2);
      const extraCost = extraGuests * (posadaConfig.extraGuestRate || 20);
      nightlyRate = baseCouple + extraCost;
    }

    const totalAmount = nights * nightlyRate;

    return { nights, nightlyRate, totalAmount };
  }, [guestForm.checkIn, guestForm.checkOut, guestForm.paxCount, posadaConfig]);

  // Check room availability & recommendations
  const checkRoomAvailability = (roomId, checkIn, checkOut, excludeBookingId = null) => {
    const conflicting = roomBookings.filter(b => {
      if (b.id === excludeBookingId) return false;
      if (b.roomId !== roomId) return false;
      return (checkIn < b.checkOut && checkOut > b.checkIn);
    });

    if (conflicting.length === 0) {
      return { available: true };
    }

    const alternativeRooms = posadaConfig.rooms.filter(r => {
      if (r.id === roomId) return false;
      const rConflict = roomBookings.some(b => {
        if (b.id === excludeBookingId) return false;
        if (b.roomId !== r.id) return false;
        return (checkIn < b.checkOut && checkOut > b.checkIn);
      });
      return !rConflict;
    });

    const latestConflictingCheckOut = conflicting.reduce((max, b) => b.checkOut > max ? b.checkOut : max, checkIn);
    const startObj = new Date(checkIn);
    const endObj = new Date(checkOut);
    const durationDays = Math.max(1, Math.ceil((endObj - startObj) / (1000 * 60 * 60 * 24)));

    const suggestedCheckIn = latestConflictingCheckOut;
    const suggestedCheckOutDate = new Date(suggestedCheckIn);
    suggestedCheckOutDate.setDate(suggestedCheckOutDate.getDate() + durationDays);
    const suggestedCheckOut = suggestedCheckOutDate.toISOString().split('T')[0];

    return {
      available: false,
      conflicting,
      alternativeRooms,
      suggestedNextDates: { checkIn: suggestedCheckIn, checkOut: suggestedCheckOut }
    };
  };

  // Open modal for CREATING new booking (Admin)
  const handleOpenCreateModal = (type, defaultRoomId = null, defaultCheckIn = null) => {
    setEditingItem(null);
    setBookingConflict(null);
    setModalType(type);
    if (type === 'room') {
      const nextDay = defaultCheckIn 
        ? new Date(new Date(defaultCheckIn).getTime() + 86400000).toISOString().split('T')[0]
        : new Date(Date.now() + 86400000).toISOString().split('T')[0];
      setRoomForm({
        roomId: defaultRoomId || posadaConfig.rooms[0]?.id || '101',
        guestName: '',
        companionNames: '',
        idNumber: '',
        phone: '',
        paxCount: 2,
        checkIn: defaultCheckIn || new Date().toISOString().split('T')[0],
        checkOut: nextDay,
        notes: ''
      });
    } else {
      setEventForm({
        eventType: 'Boda',
        date: new Date().toISOString().split('T')[0],
        contactName: '',
        contactPhone: '',
        paxCount: 30
      });
    }
    setIsModalOpen(true);
  };

  // Open modal for EDITING existing room booking
  const handleEditRoomBooking = (booking) => {
    setEditingItem(booking);
    setBookingConflict(null);
    setModalType('room');
    setRoomForm({
      roomId: booking.roomId,
      guestName: booking.guestName,
      companionNames: booking.companionNames || '',
      idNumber: booking.idNumber,
      phone: booking.phone || '',
      paxCount: booking.paxCount,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      notes: booking.notes || ''
    });
    setIsModalOpen(true);
  };

  // Open modal for EDITING existing event
  const handleEditEvent = (evt) => {
    setEditingItem(evt);
    setModalType('event');
    setEventForm({
      eventType: evt.eventType,
      date: evt.date,
      contactName: evt.contactName,
      contactPhone: evt.contactPhone,
      paxCount: evt.paxCount
    });
    setIsModalOpen(true);
  };

  // Handle Room Booking Submission (Admin)
  const handleSaveRoomBooking = (e) => {
    e.preventDefault();
    if (!roomForm.guestName || !roomForm.idNumber) {
      showToast('Por favor ingrese el nombre y la cédula del huésped.', 'error');
      return;
    }

    if (roomForm.checkIn >= roomForm.checkOut) {
      showToast('La fecha de salida debe ser posterior a la fecha de entrada.', 'error');
      return;
    }

    const availability = checkRoomAvailability(
      roomForm.roomId,
      roomForm.checkIn,
      roomForm.checkOut,
      editingItem?.id || null
    );

    if (!availability.available) {
      setBookingConflict(availability);
      showToast('La habitación ya está ocupada para esas fechas.', 'error');
      return;
    }

    setBookingConflict(null);

    if (editingItem) {
      setRoomBookings(prev => prev.map(b => b.id === editingItem.id ? {
        ...b,
        ...roomForm,
        totalAmount: roomCalculations.totalAmount
      } : b));
      showToast('Reserva modificada correctamente.');
    } else {
      const newBooking = {
        id: `res-${Date.now()}`,
        ...roomForm,
        totalAmount: roomCalculations.totalAmount,
        status: 'Confirmada'
      };
      setRoomBookings(prev => [newBooking, ...prev]);
      showToast('Reserva de habitación guardada con éxito.');
    }

    setIsModalOpen(false);
  };

  // Handle Guest Booking Submission (Public Link)
  const handleGuestSubmitBooking = (e) => {
    e.preventDefault();
    if (!guestForm.guestName || !guestForm.idNumber || !guestForm.phone) {
      showToast('Por favor complete su nombre, cédula/pasaporte y teléfono de contacto.', 'error');
      return;
    }

    if (guestForm.checkIn >= guestForm.checkOut) {
      showToast('La fecha de salida debe ser posterior a la fecha de entrada.', 'error');
      return;
    }

    const availability = checkRoomAvailability(guestForm.roomId, guestForm.checkIn, guestForm.checkOut);

    if (!availability.available) {
      setGuestConflict(availability);
      showToast('Habitación ocupada en esas fechas. Revise las opciones sugeridas.', 'error');
      return;
    }

    setGuestConflict(null);

    const newBooking = {
      id: `res-guest-${Date.now()}`,
      ...guestForm,
      totalAmount: guestCalculations.totalAmount,
      status: 'Confirmada'
    };

    // Update state and force a storage event so all admin tabs update immediately
    const updatedBookings = [newBooking, ...roomBookings];
    setRoomBookings(updatedBookings);
    try {
      localStorage.setItem('posada_room_bookings', JSON.stringify(updatedBookings));
    } catch (err) {
      console.warn('Error persisting guest booking:', err);
    }

    setGuestSuccessBooking(newBooking);
    showToast('¡Reserva registrada con éxito!');
  };

  // Handle Event Booking Submission
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventForm.eventType || !eventForm.contactName) {
      showToast('Ingrese el tipo de evento y nombre del contacto.', 'error');
      return;
    }

    if (editingItem) {
      setEventBookings(prev => prev.map(eItem => eItem.id === editingItem.id ? {
        ...eItem,
        ...eventForm
      } : eItem));
      showToast('Evento modificado correctamente.');
    } else {
      const newEvent = {
        id: `evt-${Date.now()}`,
        ...eventForm
      };
      setEventBookings(prev => [newEvent, ...prev]);
      showToast('Evento registrado correctamente.');
    }

    setIsModalOpen(false);
  };

  // Delete Room Booking
  const handleDeleteBooking = (bookingId) => {
    setRoomBookings(prev => prev.filter(b => b.id !== bookingId));
    showToast('Reserva eliminada.');
  };

  // Delete Event
  const handleDeleteEvent = (eventId) => {
    setEventBookings(prev => prev.filter(e => e.id !== eventId));
    showToast('Evento eliminado.');
  };

  // Dynamic Room Management (Admin)
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomForm.name.trim()) return;

    const newId = (Date.now() % 10000).toString();
    const createdRoom = {
      id: newId,
      name: newRoomForm.name,
      capacity: Number(newRoomForm.capacity) || 2,
      nightlyRate: Number(newRoomForm.nightlyRate) || 80,
      type: newRoomForm.type || 'Estándar'
    };

    setPosadaConfig(prev => ({ ...prev, rooms: [...prev.rooms, createdRoom] }));
    setNewRoomForm({ name: '', capacity: 2, nightlyRate: 80, type: 'Estándar' });
    showToast('Habitación añadida a la Posada.');
  };

  const handleDeleteRoom = (roomId) => {
    if (posadaConfig.rooms.length <= 1) {
      showToast('La posada debe mantener al menos una habitación.', 'error');
      return;
    }
    setPosadaConfig(prev => ({ ...prev, rooms: prev.rooms.filter(r => r.id !== roomId) }));
    showToast('Habitación eliminada de la configuración.');
  };

  // Custom Date Range Array for Weekly View
  const customRangeDays = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [];
    const days = [];
    let start = new Date(rangeStartDate + 'T00:00:00');
    const end = new Date(rangeEndDate + 'T00:00:00');

    if (start > end) return [];

    while (start <= end) {
      const dateStr = start.toISOString().split('T')[0];
      const dayLabel = start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' });
      days.push({ dateStr, label: dayLabel });
      start.setDate(start.getDate() + 1);
    }
    return days;
  }, [rangeStartDate, rangeEndDate]);

  // Monthly Visual Grid Array
  const monthCalendarGrid = useMemo(() => {
    const [year, month] = monthlyYearMonth.split('-').map(Number);
    if (!year || !month) return [];

    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month, 0).getDate();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const calendarCells = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      calendarCells.push({ empty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = dateObj.toISOString().split('T')[0];

      const occupiedBookings = roomBookings.filter(b => b.checkIn <= dateStr && b.checkOut > dateStr);
      const totalOccupied = occupiedBookings.length;
      const totalRooms = posadaConfig.rooms.length;
      const freeRooms = Math.max(0, totalRooms - totalOccupied);
      const dayOccupancyPercentage = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;
      const dayEvents = eventBookings.filter(e => e.date === dateStr);

      calendarCells.push({
        empty: false,
        day,
        dateStr,
        totalOccupied,
        freeRooms,
        totalRooms,
        dayOccupancyPercentage,
        occupiedBookings,
        dayEvents,
        key: `day-${day}`
      });
    }

    return calendarCells;
  }, [monthlyYearMonth, roomBookings, eventBookings, posadaConfig.rooms.length]);

  // Helper method for fallback clipboard operations inside restricted iframes
  const copyToClipboardSafe = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.warn('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // Copy Guest Voucher summary text for WhatsApp
  const handleCopyVoucherWhatsApp = () => {
    if (!guestSuccessBooking) return;
    const roomObj = posadaConfig.rooms.find(r => r.id === guestSuccessBooking.roomId);
    const text = `*CONFIRMACIÓN DE RESERVA - ${posadaConfig.posadaName}*\n\n` +
      `📌 *Reserva ID:* ${guestSuccessBooking.id}\n` +
      `👤 *Huésped:* ${guestSuccessBooking.guestName} (${guestSuccessBooking.idNumber})\n` +
      `📞 *Teléfono:* ${guestSuccessBooking.phone}\n` +
      `🏨 *Habitación:* ${roomObj?.name || guestSuccessBooking.roomId}\n` +
      `👥 *Huéspedes:* ${guestSuccessBooking.paxCount} persona(s)\n` +
      `📅 *Check-In:* ${guestSuccessBooking.checkIn}\n` +
      `📅 *Check-Out:* ${guestSuccessBooking.checkOut}\n` +
      `💰 *Monto Total:* ${guestSuccessBooking.totalAmount}€\n\n` +
      `¡Gracias por preferirnos!`;
    
    copyToClipboardSafe(text);
    showToast('¡Resumen de reserva copiado!');
  };

  // Generate public guest booking URL dynamically based on hosting origin
  const generatedPublicUrl = useMemo(() => {
    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('mode', 'guest');
      if (linkRoomId !== 'all') {
        currentUrl.searchParams.set('room', linkRoomId);
      } else {
        currentUrl.searchParams.delete('room');
      }
      return currentUrl.toString();
    } catch (e) {
      const baseUrl = window.location.href.split('#')[0].split('?')[0];
      return linkRoomId === 'all' 
        ? `${baseUrl}?mode=guest`
        : `${baseUrl}?mode=guest&room=${linkRoomId}`;
    }
  }, [linkRoomId]);

  const handleCopyGuestLink = (messageOnly = false) => {
    const message = `🏛️ *${posadaConfig.posadaName}*\n\nEstimado huésped, puede realizar y confirmar su reserva directamente en nuestro portal en línea ingresando en el siguiente enlace:\n👉 ${generatedPublicUrl}\n\n¡Le esperamos!`;
    
    const textToCopy = messageOnly ? message : generatedPublicUrl;
    copyToClipboardSafe(textToCopy);
    setCopiedLink(true);
    showToast(messageOnly ? '¡Mensaje con enlace copiado para WhatsApp!' : '¡Enlace copiado al portapapeles!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // ================= VIEW: PUBLIC GUEST INTERFACE =================
  if (viewMode === 'guest') {
    const selectedRoomObj = posadaConfig.rooms.find(r => r.id === guestForm.roomId);

    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 font-sans flex flex-col">
        {/* Guest Header */}
        <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-30 px-4 py-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center font-serif font-bold text-lg text-white shadow">
                B
              </div>
              <div>
                <h1 className="font-serif font-bold text-base sm:text-lg text-amber-400">{posadaConfig.posadaName}</h1>
                <p className="text-[11px] text-stone-400">Portal Público de Reservas en Línea</p>
              </div>
            </div>
            <button
              onClick={() => setViewMode('admin')}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition border border-stone-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver a Administración</span>
            </button>
          </div>
        </header>

        {/* Guest Body */}
        <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10 flex-1 w-full space-y-6">
          {guestSuccessBooking ? (
            /* Confirmation Voucher View */
            <div className="bg-stone-800/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
              <div className="text-center space-y-2 border-b border-stone-700 pb-6">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-amber-400">¡Reserva Registrada Exitosamente!</h2>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Su reserva ha sido guardada directamente en el sistema de la posada.
                </p>
              </div>

              <div className="bg-stone-900/90 rounded-2xl p-4 sm:p-6 border border-stone-700 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Código de Reserva:</span>
                  <span className="font-mono font-bold text-amber-400">{guestSuccessBooking.id}</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Huésped Principal:</span>
                  <span className="font-bold text-white">{guestSuccessBooking.guestName} ({guestSuccessBooking.idNumber})</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Teléfono Contacto:</span>
                  <span className="font-mono text-emerald-400">{guestSuccessBooking.phone}</span>
                </div>
                {guestSuccessBooking.companionNames && (
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Acompañantes:</span>
                    <span className="text-stone-300">{guestSuccessBooking.companionNames}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Habitación Reservada:</span>
                  <span className="font-bold text-amber-300">{selectedRoomObj?.name || guestSuccessBooking.roomId}</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Huéspedes:</span>
                  <span>{guestSuccessBooking.paxCount} personas</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Fechas:</span>
                  <span>{guestSuccessBooking.checkIn} ➔ {guestSuccessBooking.checkOut}</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-bold">
                  <span className="text-stone-300">Total Estancia:</span>
                  <span className="text-emerald-400">{guestSuccessBooking.totalAmount}€</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleCopyVoucherWhatsApp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg text-xs sm:text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Copiar Resumen para WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    setGuestSuccessBooking(null);
                    setGuestForm({
                      roomId: posadaConfig.rooms[0]?.id || '101',
                      guestName: '',
                      idNumber: '',
                      phone: '',
                      companionNames: '',
                      paxCount: 2,
                      checkIn: new Date().toISOString().split('T')[0],
                      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                      notes: ''
                    });
                  }}
                  className="bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold py-3 px-4 rounded-xl transition text-xs sm:text-sm"
                >
                  Hacer Otra Reserva
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form View */
            <div className="bg-stone-800/80 border border-stone-700 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
              <div className="border-b border-stone-700 pb-4">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-400">Reserva tu Estadía</h2>
                <p className="text-xs text-stone-400 mt-1">
                  Verifica disponibilidades y reserva en tiempo real con las mejores tarifas.
                </p>
              </div>

              {/* Tariff Card Banner */}
              <div className="bg-amber-950/40 border border-amber-600/30 p-4 rounded-2xl flex items-start space-x-3 text-xs">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300">Tarifas Transparentes Posada</p>
                  <p className="text-stone-300">
                    • 1 Huésped: <span className="font-bold text-amber-400">50€ / noche</span> | • Pareja (2 Huéspedes): <span className="font-bold text-amber-400">80€ / noche</span>
                  </p>
                  <p className="text-stone-400 text-[10px]">
                    + Cada huésped adicional a partir del 3º: <strong>+20€ / noche</strong>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGuestSubmitBooking} className="space-y-4 text-xs sm:text-sm">
                {/* Guest Conflict Alert */}
                {guestConflict && (
                  <div className="bg-red-950/70 border border-red-500/50 p-4 rounded-2xl space-y-3">
                    <div className="flex items-start space-x-2 text-red-300 font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                      <div>
                        <p>La habitación ya está ocupada en el rango seleccionado.</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-red-900/60 pt-2 text-xs">
                      <p className="font-bold text-stone-200">Recomendaciones disponibles:</p>
                      {guestConflict.suggestedNextDates && (
                        <div className="bg-stone-900 p-3 rounded-xl border border-red-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <p className="font-medium text-stone-300">Próxima disponibilidad libre:</p>
                            <p className="text-amber-400 font-mono text-xs">
                              {guestConflict.suggestedNextDates.checkIn} ➔ {guestConflict.suggestedNextDates.checkOut}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGuestForm({
                                ...guestForm,
                                checkIn: guestConflict.suggestedNextDates.checkIn,
                                checkOut: guestConflict.suggestedNextDates.checkOut
                              });
                              setGuestConflict(null);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Usar Fechas
                          </button>
                        </div>
                      )}

                      {guestConflict.alternativeRooms && guestConflict.alternativeRooms.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-stone-300">Otras habitaciones disponibles para sus fechas:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {guestConflict.alternativeRooms.map(altRoom => (
                              <button
                                key={altRoom.id}
                                type="button"
                                onClick={() => {
                                  setGuestForm({ ...guestForm, roomId: altRoom.id });
                                  setGuestConflict(null);
                                }}
                                className="bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-emerald-900"
                              >
                                🏨 {altRoom.name.split('-')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Habitación *</label>
                  <select
                    value={guestForm.roomId}
                    onChange={(e) => {
                      setGuestForm({ ...guestForm, roomId: e.target.value });
                      setGuestConflict(null);
                    }}
                    className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl font-medium text-white focus:border-amber-500 focus:outline-none"
                  >
                    {posadaConfig.rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Capacidad: {r.capacity} pax)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Mendoza"
                      value={guestForm.guestName}
                      onChange={(e) => setGuestForm({ ...guestForm, guestName: e.target.value })}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Cédula / Pasaporte *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: V-18.452.910"
                      value={guestForm.idNumber}
                      onChange={(e) => setGuestForm({ ...guestForm, idNumber: e.target.value })}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Teléfono de Contacto (WhatsApp) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: +58 412 9876543"
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Nombres de Acompañantes</label>
                    <input
                      type="text"
                      placeholder="Ej: María Mendoza, Ana Mendoza"
                      value={guestForm.companionNames}
                      onChange={(e) => setGuestForm({ ...guestForm, companionNames: e.target.value })}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Cantidad Huéspedes *</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedRoomObj?.capacity || 12}
                      required
                      value={guestForm.paxCount}
                      onChange={(e) => setGuestForm({ ...guestForm, paxCount: Number(e.target.value) })}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Fecha Check-In *</label>
                    <input
                      type="date"
                      required
                      value={guestForm.checkIn}
                      onChange={(e) => {
                        setGuestForm({ ...guestForm, checkIn: e.target.value });
                        setGuestConflict(null);
                      }}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-300 mb-1">Fecha Check-Out *</label>
                    <input
                      type="date"
                      required
                      value={guestForm.checkOut}
                      onChange={(e) => {
                        setGuestForm({ ...guestForm, checkOut: e.target.value });
                        setGuestConflict(null);
                      }}
                      className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1">Notas / Requerimientos Especiales</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Cuna adicional, motivo especial de viaje..."
                    value={guestForm.notes}
                    onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                    className="w-full p-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Pricing Summary Box */}
                <div className="bg-stone-900 p-4 rounded-2xl border border-amber-500/30 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-amber-400 text-sm">
                      Total: {guestCalculations.nights} Noche(s) × {guestCalculations.nightlyRate}€/noche
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {guestForm.paxCount === 1 
                        ? 'Tarifa Individual' 
                        : `Tarifa Pareja ${guestForm.paxCount > 2 ? `+ ${guestForm.paxCount - 2} huésped(es) extra (+${(guestForm.paxCount - 2) * 20}€)` : ''}`}
                    </p>
                  </div>
                  <p className="text-2xl font-serif font-bold text-emerald-400">{guestCalculations.totalAmount}€</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl transition text-base shadow-xl"
                >
                  Confirmar Reserva Ahora
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ================= VIEW: MAIN ADMIN INTERFACE =================
  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col pb-20 md:pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 max-w-[90vw] transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-stone-900 text-stone-100 shadow-md border-b border-stone-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-600 rounded-xl flex items-center justify-center font-serif font-bold text-base sm:text-lg text-white shadow shrink-0">
              B
            </div>
            <div className="truncate">
              <h1 className="font-serif text-sm sm:text-lg font-bold tracking-wide truncate">{posadaConfig.posadaName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] text-amber-400 font-medium">Sincronización en Tiempo Real</span>
                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-800 font-mono">
                  <Wifi className="w-2.5 h-2.5 animate-pulse" /> EN VIVO
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center space-x-1.5 transition shadow"
            >
              <Copy className="w-4 h-4" />
              <span>Generar Link Huésped</span>
            </button>

            <button
              onClick={() => setViewMode('guest')}
              className="bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-600/50 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition shadow"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Probar Portal Huésped</span>
              <span className="sm:hidden">Modo Huésped</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal('room')}
              className="hidden sm:flex bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl items-center space-x-2 transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Bar */}
      <nav className="bg-white border-b border-stone-200 shadow-sm sticky top-[57px] sm:top-[65px] z-20 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto scrollbar-none space-x-1 py-1.5">
          {[
            { id: 'dashboard', label: 'Panel Principal', icon: Home },
            { id: 'weekly', label: 'Ocupación por Rango', icon: Calendar },
            { id: 'monthly', label: 'Calendario Mensual', icon: Calendar },
            { id: 'events', label: 'Eventos & Bodas', icon: PartyPopper },
            { id: 'admin', label: 'Gestión Habitaciones', icon: Settings },
            { id: 'api', label: 'API n8n / IA', icon: Bot },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  active 
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300 shadow-xs' 
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full space-y-4 sm:space-y-6">

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">Habitaciones</p>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-stone-800">{posadaConfig.rooms.length}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">Reservas Activas</p>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-emerald-700">{roomBookings.length}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">Eventos</p>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-purple-700">{eventBookings.length}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-purple-50 text-purple-700 rounded-xl">
                  <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">Tarifas Posada</p>
                  <p className="text-[11px] font-bold text-stone-800">1p: 50€ | Pareja: 80€</p>
                  <p className="text-[9px] text-stone-500">+ Extra: 20€ / huésped adic.</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-stone-100 text-stone-700 rounded-xl">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>

            {/* Recent Bookings List */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-serif font-bold text-base sm:text-lg text-stone-800">Reservas Recientes (Tiempo Real)</h2>
                <button 
                  onClick={() => handleOpenCreateModal('room')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
                >
                  + Nueva Reserva
                </button>
              </div>

              {/* Mobile Card List / Desktop Table */}
              <div className="block sm:hidden space-y-3">
                {roomBookings.map(booking => {
                  const roomObj = posadaConfig.rooms.find(r => r.id === booking.roomId);
                  return (
                    <div key={booking.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-stone-900 text-xs">{booking.guestName}</p>
                          <p className="text-[10px] text-stone-500 font-mono">C.I: {booking.idNumber}</p>
                          {booking.phone && <p className="text-[10px] text-emerald-700 font-mono">📞 {booking.phone}</p>}
                        </div>
                        <span className="font-bold text-emerald-700 text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                          {booking.totalAmount}€
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 flex justify-between">
                        <span>🏨 {roomObj?.name.split('-')[0] || booking.roomId}</span>
                        <span>👥 {booking.paxCount} pax</span>
                      </div>
                      <div className="text-[10px] text-stone-500 border-t border-stone-200 pt-1 flex justify-between items-center">
                        <span>📅 {booking.checkIn} ➔ {booking.checkOut}</span>
                        <div className="flex space-x-1">
                          <button onClick={() => handleEditRoomBooking(booking)} className="p-1 text-amber-700 hover:bg-amber-100 rounded">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteBooking(booking.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 uppercase font-bold border-b border-stone-200">
                      <th className="p-3">Huésped Principal</th>
                      <th className="p-3">Cédula & Teléfono</th>
                      <th className="p-3">Habitación</th>
                      <th className="p-3">Fechas</th>
                      <th className="p-3 text-center">Cant. Pax</th>
                      <th className="p-3 text-right">Total Est. (€)</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {roomBookings.map(booking => {
                      const roomObj = posadaConfig.rooms.find(r => r.id === booking.roomId);
                      return (
                        <tr key={booking.id} className="hover:bg-stone-50/60 transition">
                          <td className="p-3 font-bold text-stone-800">
                            {booking.guestName}
                            {booking.companionNames && (
                              <p className="text-[10px] font-normal text-stone-500">Comp: {booking.companionNames}</p>
                            )}
                          </td>
                          <td className="p-3 text-stone-600">
                            <p className="font-mono">{booking.idNumber}</p>
                            {booking.phone && <p className="text-[10px] text-emerald-700 font-mono">📞 {booking.phone}</p>}
                          </td>
                          <td className="p-3 font-medium text-stone-700">{roomObj?.name || booking.roomId}</td>
                          <td className="p-3 text-stone-600">{booking.checkIn} ➔ {booking.checkOut}</td>
                          <td className="p-3 text-center font-bold">{booking.paxCount}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">{booking.totalAmount}€</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleEditRoomBooking(booking)}
                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Editar Reserva"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar Reserva"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY / CUSTOM RANGE OCCUPANCY MATRIX WITH CLICK INTERACTION */}
        {activeTab === 'weekly' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-800">Consulta de Ocupación por Rango</h2>
                <p className="text-xs text-stone-500">
                  Haga clic en cualquier celda de la tabla para ver el detalle de la reserva o registrar una nueva directamente.
                </p>
              </div>

              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:gap-3 bg-stone-50 p-2 sm:p-2.5 rounded-xl border border-stone-200">
                <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
                  <label className="text-[11px] sm:text-xs font-semibold text-stone-600">Desde:</label>
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="w-full sm:w-auto border border-stone-200 bg-white rounded-lg px-2 py-1 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
                  <label className="text-[11px] sm:text-xs font-semibold text-stone-600">Hasta:</label>
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="w-full sm:w-auto border border-stone-200 bg-white rounded-lg px-2 py-1 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Matrix Table */}
            {customRangeDays.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                Seleccione un rango de fechas válido.
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-2xl -mx-1 sm:mx-0">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-stone-900 text-stone-100 text-xs uppercase font-semibold">
                      <th className="p-3 border-b border-stone-800 w-48 sm:w-52">Habitación / Capacidad</th>
                      {customRangeDays.map(day => (
                        <th key={day.dateStr} className="p-2 border-b border-stone-800 text-center text-[10px] sm:text-[11px] min-w-[110px] sm:min-w-[130px]">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {posadaConfig.rooms.map(room => (
                      <tr key={room.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-2.5 sm:p-3 font-bold text-stone-800 bg-stone-50/60 border-r border-stone-200">
                          {room.name}
                          <div className="text-[10px] font-normal text-stone-500">
                            Cap: {room.capacity} pers | {room.type || 'Habitación'}
                          </div>
                        </td>
                        {customRangeDays.map(day => {
                          const booking = roomBookings.find(b => 
                            b.roomId === room.id &&
                            b.checkIn <= day.dateStr &&
                            b.checkOut > day.dateStr
                          );

                          return (
                            <td key={day.dateStr} className="p-1 sm:p-1.5 border-r border-stone-100 align-top">
                              {booking ? (
                                <div 
                                  onClick={() => setMatrixDetailModal({ booking, room })}
                                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg p-1.5 sm:p-2 space-y-1 shadow-xs text-[9px] sm:text-[10px] cursor-pointer transition active:scale-98"
                                >
                                  <p className="font-bold text-amber-950 truncate">🏨 {room.name.split('-')[0]}</p>
                                  <p className="font-semibold text-stone-800 truncate">👤 {booking.guestName}</p>
                                  <div className="text-[9px] text-amber-800 border-t border-amber-200 pt-0.5 space-y-0.5">
                                    <p>📥 In: {booking.checkIn}</p>
                                    <p>📤 Out: {booking.checkOut}</p>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => handleOpenCreateModal('room', room.id, day.dateStr)}
                                  className="py-3 sm:py-4 text-center cursor-pointer hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[8px] sm:text-[9px] font-bold">
                                    + Reservar
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MONTHLY VISUAL CALENDAR GRID */}
        {activeTab === 'monthly' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-800">Calendario Mensual Interactivo</h2>
                <p className="text-xs text-stone-500">Toque o haga clic en un día para abrir la leyenda completa de ocupación.</p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label className="text-xs font-semibold text-stone-600">Mes:</label>
                <input
                  type="month"
                  value={monthlyYearMonth}
                  onChange={(e) => setMonthlyYearMonth(e.target.value)}
                  className="w-full sm:w-auto border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Monthly Grid */}
            <div className="bg-white p-2 sm:p-4 rounded-2xl border border-stone-200 shadow-sm space-y-2 sm:space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-xs text-stone-500 uppercase pb-2 border-b border-stone-100">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {monthCalendarGrid.map((cell) => {
                  if (cell.empty) {
                    return <div key={cell.key} className="h-20 sm:h-28 bg-stone-50/40 rounded-lg sm:rounded-xl border border-dashed border-stone-100"></div>;
                  }

                  const isFull = cell.freeRooms === 0;
                  const isHigh = cell.dayOccupancyPercentage >= 70;
                  const isSelected = selectedDayDetails?.dateStr === cell.dateStr;

                  return (
                    <div
                      key={cell.key}
                      onClick={() => setSelectedDayDetails(cell)}
                      className={`h-20 sm:h-28 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex flex-col justify-between cursor-pointer transition hover:shadow-md ${
                        isSelected 
                          ? 'ring-2 ring-amber-500 shadow-md bg-amber-50' 
                          : isFull
                          ? 'bg-red-50/60 border-red-200 text-red-900'
                          : isHigh
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs sm:text-sm">{cell.day}</span>
                        <span className={`text-[8px] sm:text-[10px] font-bold px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-full ${
                          isFull ? 'bg-red-200 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {cell.dayOccupancyPercentage}%
                        </span>
                      </div>

                      <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[11px]">
                        <div className="flex justify-between text-stone-600">
                          <span className="hidden sm:inline">Ocupadas:</span>
                          <span className="font-bold">{cell.totalOccupied}/{cell.totalRooms}</span>
                        </div>
                        <div className="hidden sm:flex justify-between text-stone-500">
                          <span>Libres:</span>
                          <span className="font-bold text-emerald-600">{cell.freeRooms}</span>
                        </div>
                      </div>

                      {cell.dayEvents.length > 0 && (
                        <div className="bg-purple-100 text-purple-900 text-[8px] sm:text-[9px] px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded truncate font-medium">
                          🎉 {cell.dayEvents[0].eventType}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details Legend Panel */}
            {selectedDayDetails && (
              <div className="bg-stone-900 text-stone-100 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-amber-400">
                      Leyenda de Información — {selectedDayDetails.dateStr}
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      Ocupación: {selectedDayDetails.totalOccupied} / {selectedDayDetails.totalRooms} Habitaciones
                    </p>
                  </div>
                  <button onClick={() => setSelectedDayDetails(null)} className="text-stone-400 hover:text-white font-bold text-sm">✕ Cerrar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs">
                  {/* Occupied Rooms Legend */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Home className="w-4 h-4" /> Habitaciones Ocupadas ({selectedDayDetails.occupiedBookings.length})
                    </h4>
                    {selectedDayDetails.occupiedBookings.length === 0 ? (
                      <p className="text-stone-500 italic">No hay habitaciones ocupadas en este día.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayDetails.occupiedBookings.map(b => {
                          const roomObj = posadaConfig.rooms.find(r => r.id === b.roomId);
                          return (
                            <div key={b.id} className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="font-bold text-amber-300 text-xs sm:text-sm">{roomObj?.name || b.roomId}</p>
                                <p className="text-stone-300">
                                  <span className="text-stone-400">Huésped: </span>
                                  <span className="font-bold">{b.guestName}</span> ({b.idNumber})
                                </p>
                                {b.phone ? (
                                  <p className="text-stone-300">
                                    <span className="text-stone-400">Teléfono: </span>
                                    <span>{b.phone}</span>
                                  </p>
                                ) : null}
                                {b.companionNames ? (
                                  <p className="text-stone-300">
                                    <span className="text-stone-400">Acompañantes: </span>
                                    <span>{b.companionNames}</span>
                                  </p>
                                ) : null}
                                <p className="text-stone-300">
                                  <span className="text-stone-400">Estadía: </span>
                                  <span>{b.checkIn} ➔ {b.checkOut}</span>
                                </p>
                              </div>
                              <button
                                onClick={() => handleEditRoomBooking(b)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded-lg text-[10px]"
                              >
                                Modificar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Scheduled Events Legend */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                      <PartyPopper className="w-4 h-4" /> Eventos Programados ({selectedDayDetails.dayEvents.length})
                    </h4>
                    {selectedDayDetails.dayEvents.length === 0 ? (
                      <p className="text-stone-500 italic">No hay eventos especiales en este día.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayDetails.dayEvents.map(evt => (
                          <div key={evt.id} className="bg-purple-950/60 p-3 rounded-xl border border-purple-800 flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase bg-purple-800 text-purple-200 px-2 py-0.5 rounded">
                                {evt.eventType}
                              </span>
                              <p className="font-bold text-purple-100 text-xs sm:text-sm mt-1">👥 Contacto: {evt.contactName}</p>
                              <p><span className="text-purple-300">Teléfono:</span> {evt.contactPhone}</p>
                              <p><span className="text-purple-300">Invitados:</span> {evt.paxCount} personas</p>
                            </div>
                            <button
                              onClick={() => handleEditEvent(evt)}
                              className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-2 py-1 rounded-lg text-[10px]"
                            >
                              Modificar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EVENTS MANAGER */}
        {activeTab === 'events' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-800">Eventos Especiales & Bodas</h2>
                <p className="text-xs text-stone-500">Gestión de bodas, reuniones corporativas y celebraciones.</p>
              </div>
              <button
                onClick={() => handleOpenCreateModal('event')}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3 sm:px-4 py-2 rounded-xl flex items-center space-x-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Registrar Evento</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventBookings.map(evt => (
                <div key={evt.id} className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                        {evt.eventType}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-stone-600">{evt.date}</span>
                      <button
                        onClick={() => handleEditEvent(evt)}
                        className="p-1 text-purple-700 hover:bg-purple-100 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-stone-700 space-y-1">
                    <p>📌 <strong>Evento:</strong> {evt.title || evt.eventType}</p>
                    <p>👤 <strong>Contacto:</strong> {evt.contactName}</p>
                    <p>📞 <strong>Teléfono:</strong> {evt.contactPhone}</p>
                    <p>👥 <strong>Invitados:</strong> {evt.paxCount} personas</p>
                    {evt.notes && <p className="text-stone-500 text-[11px] italic">📝 {evt.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN CONFIGURATION & ROOM MANAGEMENT */}
        {activeTab === 'admin' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 sm:space-y-6">
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-800">Gestión de Habitaciones Posada</h2>
              <p className="text-xs text-stone-500">Agregue, modifique o remueva habitaciones (incluyendo Duplex de 4 a 8 pax).</p>
            </div>

            {/* Add Room Form */}
            <form onSubmit={handleAddRoom} className="bg-stone-50 p-3 sm:p-4 rounded-xl border border-stone-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre / Tipo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Hab 106 - Duplex V. Real"
                  value={newRoomForm.name}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Capacidad *</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={newRoomForm.capacity}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, capacity: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tarifa Noche (€) *</label>
                <input
                  type="number"
                  min="10"
                  value={newRoomForm.nightlyRate}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, nightlyRate: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition shadow-xs"
                >
                  + Agregar Habitación
                </button>
              </div>
            </form>

            {/* Existing Rooms List */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-stone-700">Habitaciones Configuradas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {posadaConfig.rooms.map(room => (
                  <div key={room.id} className="p-4 rounded-xl border border-stone-200 bg-white space-y-2 flex justify-between items-center shadow-2xs">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-stone-800">{room.name}</p>
                      <p className="text-xs text-stone-500">Capacidad: <strong>{room.capacity} personas</strong></p>
                      <p className="text-xs text-amber-700 font-semibold">Tarifa Base: {room.nightlyRate}€ / noche</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: n8n AI API SIMULATOR */}
        {activeTab === 'api' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 sm:space-y-6">
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-800">Integración con Agente de IA (n8n)</h2>
              <p className="text-xs text-stone-500">Endpoints para móviles y servidor para sincronizar disponibilidad y reservas.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-900 text-stone-100 p-4 rounded-xl space-y-2 text-xs font-mono shadow-md">
                <p className="text-amber-400 font-bold">// GET /api/v1/availability</p>
                <p className="text-stone-400">Entrada: ?checkIn=2026-11-10&checkOut=2026-11-12&pax=2</p>
                <p className="text-emerald-400">Respuesta JSON: {'{ status: "success", availableRooms: 4 }'}</p>
              </div>

              <div className="bg-stone-900 text-stone-100 p-4 rounded-xl space-y-2 text-xs font-mono shadow-md">
                <p className="text-amber-400 font-bold">// POST /api/v1/bookings</p>
                <p className="text-stone-400">Payload: {'{ "guestName": "Juan Pérez", "idNumber": "V-12345678", "roomId": "101", "checkIn": "2026-11-10", "checkOut": "2026-11-12", "paxCount": 2 }'}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile Phones */}
      <div className="fixed bottom-16 right-4 sm:hidden z-40">
        <button
          onClick={() => handleOpenCreateModal('room')}
          className="w-13 h-13 bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {[
          { id: 'dashboard', label: 'Inicio', icon: Home },
          { id: 'weekly', label: 'Rangos', icon: Calendar },
          { id: 'monthly', label: 'Mensual', icon: Calendar },
          { id: 'events', label: 'Eventos', icon: PartyPopper },
          { id: 'admin', label: 'Admin', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
                active ? 'text-amber-700 font-bold' : 'text-stone-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal Dialog (Range Matrix Item Cell Details) */}
      {matrixDetailModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-amber-800">
                  Detalle de Reserva
                </h3>
                <p className="text-xs text-stone-500">{matrixDetailModal.room.name}</p>
              </div>
              <button onClick={() => setMatrixDetailModal(null)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <p>👤 <strong>Huésped:</strong> {matrixDetailModal.booking.guestName}</p>
              <p>🪪 <strong>Cédula:</strong> {matrixDetailModal.booking.idNumber}</p>
              {matrixDetailModal.booking.phone && <p>📞 <strong>Teléfono:</strong> {matrixDetailModal.booking.phone}</p>}
              {matrixDetailModal.booking.companionNames && <p>👥 <strong>Acompañantes:</strong> {matrixDetailModal.booking.companionNames}</p>}
              <p>👥 <strong>Huéspedes Total:</strong> {matrixDetailModal.booking.paxCount} pax</p>
              <p>📅 <strong>Fechas:</strong> {matrixDetailModal.booking.checkIn} ➔ {matrixDetailModal.booking.checkOut}</p>
              <p>💰 <strong>Monto Total:</strong> <span className="font-bold text-emerald-700">{matrixDetailModal.booking.totalAmount}€</span></p>
              {matrixDetailModal.booking.notes && <p>📝 <strong>Notas:</strong> {matrixDetailModal.booking.notes}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const b = matrixDetailModal.booking;
                  setMatrixDetailModal(null);
                  handleEditRoomBooking(b);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-xs"
              >
                Editar Reserva
              </button>
              <button
                onClick={() => {
                  const id = matrixDetailModal.booking.id;
                  setMatrixDetailModal(null);
                  handleDeleteBooking(id);
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2.5 rounded-xl transition text-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog (Link Generator for Guest) */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">
                Generar Enlace para Huésped
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-stone-600">
                Comparta este enlace con sus clientes por WhatsApp, correo o redes sociales para que puedan reservar directamente.
              </p>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pre-seleccionar Habitación (Opcional):</label>
                <select
                  value={linkRoomId}
                  onChange={(e) => setLinkRoomId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white font-medium"
                >
                  <option value="all">Todas las habitaciones (Portal General)</option>
                  {posadaConfig.rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                <label className="block font-semibold text-stone-700">Enlace Público de Reserva:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedPublicUrl}
                    className="w-full p-2 bg-white border rounded-lg font-mono text-[11px] text-amber-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyGuestLink(false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg transition shrink-0"
                  >
                    {copiedLink ? '¡Copiado!' : 'Copiar URL'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                <p className="font-bold text-amber-950">Previsualización del Mensaje para WhatsApp:</p>
                <div className="text-[11px] text-stone-700 bg-white p-2.5 rounded-lg border border-amber-200 space-y-1">
                  <p className="font-bold text-stone-900">🏛️ {posadaConfig.posadaName}</p>
                  <p>Estimado huésped, puede realizar y confirmar su reserva directamente en nuestro portal en línea ingresando en el siguiente enlace:</p>
                  <p className="font-mono text-amber-700 underline break-all">👉 {generatedPublicUrl}</p>
                  <p className="font-medium text-amber-900 pt-1">¡Le esperamos!</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyGuestLink(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 text-xs transition shadow"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Copiar Mensaje Completo (WhatsApp)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setViewMode('guest');
                }}
                className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold py-2.5 px-3 rounded-xl text-xs transition"
              >
                Probar Vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog (Admin Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">
                {editingItem 
                  ? (modalType === 'room' ? 'Modificar Reserva' : 'Modificar Evento')
                  : (modalType === 'room' ? 'Nueva Reserva de Habitación' : 'Registrar Evento')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            {modalType === 'room' ? (
              <form onSubmit={handleSaveRoomBooking} className="space-y-3 sm:space-y-4 text-xs">
                {/* Conflict Alert Box with Recommendations */}
                {bookingConflict && (
                  <div className="bg-red-50 border border-red-200 p-3 sm:p-4 rounded-xl space-y-2 sm:space-y-3">
                    <div className="flex items-start space-x-2 text-red-800 font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                      <div>
                        <p>¡Habitación Ocupada en estas fechas!</p>
                        <p className="text-[10px] sm:text-[11px] font-normal text-red-700">
                          Cuenta con reservas activas durante el rango seleccionado.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-red-200 pt-2 text-[10px] sm:text-[11px]">
                      <p className="font-bold text-stone-800">Opciones sugeridas:</p>

                      {bookingConflict.suggestedNextDates && (
                        <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <p className="font-semibold text-stone-700">Próximas Fechas Libres:</p>
                            <p className="text-amber-800 font-mono text-[10px]">
                              {bookingConflict.suggestedNextDates.checkIn} ➔ {bookingConflict.suggestedNextDates.checkOut}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRoomForm({
                                ...roomForm,
                                checkIn: bookingConflict.suggestedNextDates.checkIn,
                                checkOut: bookingConflict.suggestedNextDates.checkOut
                              });
                              setBookingConflict(null);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-md text-[10px]"
                          >
                            Aplicar Fechas
                          </button>
                        </div>
                      )}

                      {bookingConflict.alternativeRooms && bookingConflict.alternativeRooms.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-semibold text-stone-700">Otras Habitaciones Libres:</p>
                          <div className="flex flex-wrap gap-1">
                            {bookingConflict.alternativeRooms.map(altRoom => (
                              <button
                                key={altRoom.id}
                                type="button"
                                onClick={() => {
                                  setRoomForm({ ...roomForm, roomId: altRoom.id });
                                  setBookingConflict(null);
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold px-2 py-1 rounded-md text-[9px] sm:text-[10px]"
                              >
                                🏨 {altRoom.name.split('-')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Habitación *</label>
                  <select
                    value={roomForm.roomId}
                    onChange={(e) => {
                      setRoomForm({...roomForm, roomId: e.target.value});
                      setBookingConflict(null);
                    }}
                    className="w-full p-2.5 border rounded-xl bg-white font-medium"
                  >
                    {posadaConfig.rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.capacity} pax)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Nombre Huésped *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre y Apellido"
                      value={roomForm.guestName}
                      onChange={(e) => setRoomForm({...roomForm, guestName: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Cédula / Pasaporte *</label>
                    <input
                      type="text"
                      required
                      placeholder="V-12.345.678"
                      value={roomForm.idNumber}
                      onChange={(e) => setRoomForm({...roomForm, idNumber: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Teléfono Contacto</label>
                    <input
                      type="text"
                      placeholder="+58 412 1234567"
                      value={roomForm.phone}
                      onChange={(e) => setRoomForm({...roomForm, phone: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Acompañantes</label>
                    <input
                      type="text"
                      placeholder="Ej: Maria Perez, Pedro Perez"
                      value={roomForm.companionNames}
                      onChange={(e) => setRoomForm({...roomForm, companionNames: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Huéspedes</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={roomForm.paxCount}
                      onChange={(e) => setRoomForm({...roomForm, paxCount: Number(e.target.value)})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Check-In *</label>
                    <input
                      type="date"
                      required
                      value={roomForm.checkIn}
                      onChange={(e) => {
                        setRoomForm({...roomForm, checkIn: e.target.value});
                        setBookingConflict(null);
                      }}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Check-Out *</label>
                    <input
                      type="date"
                      required
                      value={roomForm.checkOut}
                      onChange={(e) => {
                        setRoomForm({...roomForm, checkOut: e.target.value});
                        setBookingConflict(null);
                      }}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-900">Total Noches: {roomCalculations.nights}</p>
                    <p className="text-[10px] text-amber-700">{roomCalculations.nightlyRate}€ / noche</p>
                  </div>
                  <p className="text-lg font-serif font-bold text-amber-900">{roomCalculations.totalAmount}€</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm shadow"
                >
                  {editingItem ? 'Guardar Cambios' : 'Guardar Reserva'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveEvent} className="space-y-3 sm:space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tipo de Evento *</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}
                    className="w-full p-2.5 border rounded-xl bg-white font-medium"
                  >
                    <option value="Boda">Boda</option>
                    <option value="Cumpleaños">Cumpleaños</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Sesión Fotográfica">Sesión Fotográfica</option>
                    <option value="Otro">Otro Evento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Nombre de Contacto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre y Apellido"
                      value={eventForm.contactName}
                      onChange={(e) => setEventForm({...eventForm, contactName: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Teléfono *</label>
                    <input
                      type="text"
                      required
                      placeholder="+58 414 1234567"
                      value={eventForm.contactPhone}
                      onChange={(e) => setEventForm({...eventForm, contactPhone: e.target.value})}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Invitados *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={eventForm.paxCount}
                    onChange={(e) => setEventForm({...eventForm, paxCount: Number(e.target.value)})}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition text-sm shadow"
                >
                  {editingItem ? 'Guardar Cambios' : 'Registrar Evento'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}