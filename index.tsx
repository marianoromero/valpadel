import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- Type Definitions ---
interface BookingDetails {
    name: string;
    comment: string;
    secretKey: string;
}

interface TimeSlotBookings {
    [time: string]: BookingDetails;
}

interface CourtBookings {
    [court: string]: TimeSlotBookings;
}

interface AllBookings {
    [date: string]: CourtBookings;
}

interface ModalSlot {
    court: number;
    time: string;
    date: Date;
}

interface CancellationModalData extends ModalSlot {
    name: string;
}

interface BookingSubmission {
    name: string;
    secretKey: string;
    comment: string;
}

interface InfoModalContent {
    title: string;
    message: string;
}


const PADEL_COURTS = [2, 3];
const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '16:30', '18:00', '19:30', '21:00'];
const BOOKINGS_KEY = 'valpadel-bookings';
const MORNING_SLOTS = ['09:00', '10:30', '12:00', '13:30'];

// --- Helper Functions ---
const getWeekDays = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
    }
    return days;
};

const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const Logo = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
            <linearGradient id="racketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#9FC131' }} />
                <stop offset="100%" style={{ stopColor: '#DBF227' }} />
            </linearGradient>
            <style>
                {`.palm-leaf { fill: #005C53; }`}
            </style>
        </defs>
        <g transform="translate(0, 10)">
            <path d="M 25,85 L 28, 45 L 38,45 L 41,85 Z" fill="#D96941" />
            <circle cx="33" cy="30" r="25" fill="url(#racketGradient)" stroke="#042940" strokeWidth="3" />
            
            <path className="palm-leaf" d="M 33,5 C 5,5 15,30 33,30 Z" transform="rotate(-30, 33, 5)"/>
            <path className="palm-leaf" d="M 33,5 C 61,5 51,30 33,30 Z" transform="rotate(30, 33, 5)"/>
            <path className="palm-leaf" d="M 33,5 C 20, -15 46, -15 33,5 Z" />
        </g>
    </svg>
);

const EyeIconOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeIconClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
);


// --- Components ---
const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // BeforeInstallPromptEvent is not in standard lib.d.ts

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
    };

    if (!deferredPrompt) return null;

    return (
        <button className="install-button" onClick={handleInstallClick}>
            Instalar App
        </button>
    );
};

const BookingModal = ({ slot, onBook, onClose }: { slot: ModalSlot | null, onBook: (details: BookingSubmission) => void, onClose: () => void }) => {
    const [name, setName] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [comment, setComment] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !secretKey.trim()) {
            alert('El nombre y la clave son obligatorios.');
            return;
        }
        onBook({ name, secretKey, comment });
    };
    
    if (!slot) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Reservar Pista</h2>
                <p><strong>Día:</strong> {slot.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p><strong>Hora:</strong> {slot.time} en <strong>Pista {slot.court}</strong></p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Nombre</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="key">Clave (6 dígitos)</label>
                        <div className="password-input-container">
                            <input id="key" type={isKeyVisible ? "text" : "password"} value={secretKey} onChange={e => setSecretKey(e.target.value)} required maxLength={6} pattern="\d{6}" title="La clave debe ser de 6 dígitos."/>
                            <button type="button" className="password-toggle-btn" onClick={() => setIsKeyVisible(!isKeyVisible)} aria-label={isKeyVisible ? "Ocultar clave" : "Mostrar clave"}>
                                {isKeyVisible ? <EyeIconOpen /> : <EyeIconClosed />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="comment">Comentario (opcional)</label>
                        <textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={80}></textarea>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="book-btn">Reservar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CancellationModal = ({ slot, onCancel, onClose }: { slot: CancellationModalData | null, onCancel: (secretKey: string) => void, onClose: () => void }) => {
    const [secretKey, setSecretKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!secretKey.trim()) {
            return;
        }
        onCancel(secretKey);
    };

    if (!slot) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Cancelar Reserva</h2>
                <p>Está a punto de cancelar la reserva para:</p>
                <p><strong>Día:</strong> {slot.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p><strong>Hora:</strong> {slot.time} en <strong>Pista {slot.court}</strong></p>
                <p><strong>A nombre de:</strong> {slot.name}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="cancel-key">Clave de la reserva (6 dígitos)</label>
                        <div className="password-input-container">
                             <input id="cancel-key" type={isKeyVisible ? "text" : "password"} value={secretKey} onChange={e => setSecretKey(e.target.value)} required maxLength={6} pattern="\d{6}" title="La clave debe ser de 6 dígitos." autoFocus />
                             <button type="button" className="password-toggle-btn" onClick={() => setIsKeyVisible(!isKeyVisible)} aria-label={isKeyVisible ? "Ocultar clave" : "Mostrar clave"}>
                                {isKeyVisible ? <EyeIconOpen /> : <EyeIconClosed />}
                            </button>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Volver</button>
                        <button type="submit" className="book-btn">Confirmar Cancelación</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InfoModal = ({ content, onClose }: { content: InfoModalContent, onClose: () => void }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{content.title}</h2>
            <p className="info-modal-message">{content.message}</p>
            <div className="modal-actions info-modal-actions">
                <button type="button" className="book-btn" onClick={onClose}>Aceptar</button>
            </div>
        </div>
    </div>
);


const TimeSlotView = ({ court, date, bookings, onBook, onBack, onCancelRequest }: { court: number; date: Date; bookings: AllBookings; onBook: (slot: Omit<ModalSlot, 'date'>) => void; onBack: () => void; onCancelRequest: (data: CancellationModalData) => void; }) => {
    const dailyBookings = bookings[formatDateKey(date)] || {};

    const renderTimeSlot = (time: string) => {
        const booking = dailyBookings[String(court)]?.[time];
        return booking ? (
            <button 
                key={time} 
                className="time-slot booked"
                onClick={() => onCancelRequest({ court, time, date, name: booking.name })}
                aria-label={`Cancelar reserva a nombre de ${booking.name} a las ${time}`}
            >
                <span>{time}</span>
                <span className="booked-name">{booking.name}</span>
                {booking.comment && <span className="booked-comment">{booking.comment}</span>}
            </button>
        ) : (
            <button 
                key={time} 
                className="time-slot available"
                onClick={() => onBook({ court, time })}
            >
                {time}
            </button>
        );
    };

    const morningSlots = TIME_SLOTS.filter(t => MORNING_SLOTS.includes(t));
    const afternoonSlots = TIME_SLOTS.filter(t => !MORNING_SLOTS.includes(t));

    return (
        <div className="timeslot-view">
            <div className="timeslot-header">
                <button onClick={onBack} className="back-button">&lt;&lt; Volver</button>
                <h2 className="court-title">▶ Pista {court}</h2>
            </div>
            <div className="time-slots-list">
                {morningSlots.map(renderTimeSlot)}
                
                <div className="schedule-separator">
                    <span className="separator-text">Mañana</span>
                    <div className="separator-line"></div>
                    <span className="separator-text">Tarde</span>
                </div>

                {afternoonSlots.map(renderTimeSlot)}
            </div>
        </div>
    );
};


const CourtSelectionView = ({ onSelectCourt }: { onSelectCourt: (court: number) => void }) => {
    return (
        <div className="court-selection-view">
            {PADEL_COURTS.map(court => (
                <button key={court} className="court-selection-btn" onClick={() => onSelectCourt(court)}>
                    <span className="court-text">Pista</span>
                    <span className="court-number">{court}</span>
                </button>
            ))}
        </div>
    );
};

function App() {
    const weekDays = useMemo(() => getWeekDays(), []);
    const [selectedDayIndex, setSelectedDayIndex] = useState(weekDays.findIndex(d => formatDateKey(d) === formatDateKey(new Date())) > -1 ? weekDays.findIndex(d => formatDateKey(d) === formatDateKey(new Date())) : 0);
    const [bookings, setBookings] = useState<AllBookings>({});
    const [modalSlot, setModalSlot] = useState<ModalSlot | null>(null);
    const [cancellationSlot, setCancellationSlot] = useState<CancellationModalData | null>(null);
    const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
    const [infoModalContent, setInfoModalContent] = useState<InfoModalContent | null>(null);

    useEffect(() => {
        try {
            const storedBookings = localStorage.getItem(BOOKINGS_KEY);
            if (storedBookings) {
                setBookings(JSON.parse(storedBookings));
            }
        } catch (error) {
            console.error("Failed to load bookings from localStorage", error);
        }
    }, []);

    const saveBookings = useCallback((newBookings: AllBookings) => {
        try {
            localStorage.setItem(BOOKINGS_KEY, JSON.stringify(newBookings));
            setBookings(newBookings);
        } catch (error) {
            console.error("Failed to save bookings to localStorage", error);
        }
    }, []);
    
    const selectedDate = weekDays[selectedDayIndex] || weekDays[0];
    const dateKey = formatDateKey(selectedDate);

    const handleBookSlot = useCallback((bookingDetails: BookingSubmission) => {
        if (!modalSlot) return;
        const { court, time } = modalSlot;
        
        const newBookings = JSON.parse(JSON.stringify(bookings));
        if (!newBookings[dateKey]) {
            newBookings[dateKey] = {};
        }
        
        const courtKey = String(court);
        if (!newBookings[dateKey][courtKey]) {
            newBookings[dateKey][courtKey] = {};
        }
        
        newBookings[dateKey][courtKey][time] = { 
            name: bookingDetails.name, 
            comment: bookingDetails.comment,
            secretKey: bookingDetails.secretKey
        };
        
        saveBookings(newBookings);
        setModalSlot(null);
        setSelectedCourt(court); // Stay on the court view
    }, [modalSlot, bookings, dateKey, saveBookings]);

    const handleCancelBooking = useCallback((enteredKey: string) => {
        if (!cancellationSlot) return;

        const { date, court, time } = cancellationSlot;
        const keyForDate = formatDateKey(date);
        
        const bookingToCancel = bookings[keyForDate]?.[String(court)]?.[time];
        
        if (bookingToCancel && bookingToCancel.secretKey === enteredKey) {
            const newBookings = JSON.parse(JSON.stringify(bookings));
            
            delete newBookings[keyForDate][String(court)][time];
            
            // Cleanup empty objects
            if (Object.keys(newBookings[keyForDate][String(court)]).length === 0) {
                delete newBookings[keyForDate][String(court)];
            }
            if (Object.keys(newBookings[keyForDate]).length === 0) {
                delete newBookings[keyForDate];
            }
            
            saveBookings(newBookings);
            setCancellationSlot(null);
            setInfoModalContent({
                title: 'Reserva Cancelada',
                message: 'Su reserva ha sido cancelada correctamente, gracias'
            });

        } else {
            setInfoModalContent({
                title: 'Clave Incorrecta',
                message: 'Su clave es incorrecta, la reserva no ha podido ser cancelada'
            });
        }
    }, [cancellationSlot, bookings, saveBookings]);

    const changeDay = (offset: number) => {
        setSelectedDayIndex(prev => {
            const newIndex = prev + offset;
            if (newIndex >= 0 && newIndex < weekDays.length) {
                setSelectedCourt(null); // Reset view when changing day
                return newIndex;
            }
            return prev;
        });
    };

    return (
        <div className="app-container">
            <header className="header">
                <div className="logo-container">
                    <Logo />
                    <h1 className="app-title">ValPadel</h1>
                </div>
                <InstallPWA />
            </header>

            <main className="main-content">
                <div className="date-selector">
                    <button onClick={() => changeDay(-1)} disabled={selectedDayIndex === 0}>&lt;</button>
                    <span className="date-display">
                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <button onClick={() => changeDay(1)} disabled={selectedDayIndex === weekDays.length - 1}>&gt;</button>
                </div>

                {selectedCourt === null ? (
                    <CourtSelectionView onSelectCourt={setSelectedCourt} />
                ) : (
                    <TimeSlotView
                        court={selectedCourt}
                        date={selectedDate}
                        bookings={bookings}
                        onBook={({ court, time }) => setModalSlot({ court, time, date: selectedDate })}
                        onBack={() => setSelectedCourt(null)}
                        onCancelRequest={setCancellationSlot}
                    />
                )}
            </main>

            {modalSlot && (
                <BookingModal
                    slot={modalSlot}
                    onBook={handleBookSlot}
                    onClose={() => setModalSlot(null)}
                />
            )}

            {cancellationSlot && (
                <CancellationModal
                    slot={cancellationSlot}
                    onCancel={handleCancelBooking}
                    onClose={() => setCancellationSlot(null)}
                />
            )}
            
            {infoModalContent && (
                <InfoModal
                    content={infoModalContent}
                    onClose={() => setInfoModalContent(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);