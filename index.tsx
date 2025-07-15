import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BookingService, type Booking } from './lib/bookingService';

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

const BurgerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);


// --- Components ---
const SideMenu = ({ isOpen, onClose, bookings, weekDays }: { isOpen: boolean; onClose: () => void; bookings: AllBookings; weekDays: Date[] }) => {
    const [activeSection, setActiveSection] = useState<'partidos' | 'faq'>('partidos');
    const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

    const faqData = [
        {
            question: "¿Cómo hago una reserva?",
            answer: "Selecciona el día, luego la pista y finalmente la hora disponible. Rellena el formulario con tu nombre, una clave de 6 dígitos y opcionalmente un comentario."
        },
        {
            question: "¿Puedo cancelar mi reserva?",
            answer: "Sí, puedes cancelar tu reserva haciendo clic en tu franja horaria reservada e introduciendo la clave de 6 dígitos que usaste al reservar."
        },
        {
            question: "¿Cuándo puedo reservar?",
            answer: "Las reservas de cada semana se abren cada lunes a las 00:00. Puedes reservar para cualquier día de la semana actual. Las franjas de reservas van desde las 9:00 hasta las 22:30."
        },
        {
            question: "¿Qué pasa si olvido mi clave?",
            answer: "La clave es necesaria para cancelar reservas. Si la olvidas y quieres cancelar, intenta comunicarlo en los grupos de Whatsapp de pádel de la comunidad."

        },
        {
            question: "¿Puedo reservar dos franjas seguidas de una pista?",
            answer: "Como poder, la aplicación lo permite, pero no es lo ideal. Excepcionalmente en épocas de calor, si quieres empezar a las 20:00 en vez de a las 19:30 por ejemplo, reserva a las 19:30 y deja un comentario avisando que comienzas a las 20:00 (siempre y cuando la franja de las 21:00 no esté ya reservada en ese momento)."
        },
          {
            question: "Quiero reservar todos los Martes a las 21:00, ¿no puedo?",
            answer: "No de forma automática. Tendrás que hacer una nueva reserva cada semana."
        }
    ];

    const getWeeklyBookings = () => {
        const weeklyBookings: { [date: string]: { court: string; time: string; name: string }[] } = {};
        
        weekDays.forEach(day => {
            const dateKey = formatDateKey(day);
            const dayBookings = bookings[dateKey];
            
            if (dayBookings) {
                const dayBookingsList: { court: string; time: string; name: string }[] = [];
                
                PADEL_COURTS.forEach(court => {
                    const courtBookings = dayBookings[court];
                    if (courtBookings) {
                        Object.entries(courtBookings).forEach(([time, booking]) => {
                            dayBookingsList.push({ court: `Pista ${court}`, time, name: booking.name });
                        });
                    }
                });
                
                if (dayBookingsList.length > 0) {
                    // Sort by time
                    dayBookingsList.sort((a, b) => a.time.localeCompare(b.time));
                    weeklyBookings[dateKey] = dayBookingsList;
                }
            }
        });
        
        return weeklyBookings;
    };

    const weeklyBookings = getWeeklyBookings();
    const hasBookings = Object.keys(weeklyBookings).length > 0;

    if (!isOpen) return null;

    return (
        <div className="side-menu-overlay" onClick={onClose}>
            <div className="side-menu" onClick={e => e.stopPropagation()}>
                <div className="side-menu-header">
                    <h2>Menú</h2>
                    <button className="close-menu-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="side-menu-tabs">
                    <button 
                        className={`tab-btn ${activeSection === 'partidos' ? 'active' : ''}`}
                        onClick={() => setActiveSection('partidos')}
                    >
                        Partidos Semana
                    </button>
                    <button 
                        className={`tab-btn ${activeSection === 'faq' ? 'active' : ''}`}
                        onClick={() => setActiveSection('faq')}
                    >
                        FAQ
                    </button>
                </div>

                <div className="side-menu-content">
                    {activeSection === 'partidos' && (
                        <div className="partidos-section">
                            {!hasBookings ? (
                                <div className="no-bookings">
                                    <p>Aún no hay partidos esta semana, reserva tú el primero! 😉</p>
                                </div>
                            ) : (
                                <div className="weekly-bookings">
                                    {Object.entries(weeklyBookings).map(([dateKey, dayBookings]) => {
                                        const date = new Date(dateKey);
                                        return (
                                            <div key={dateKey} className="day-bookings">
                                                <h3 className="day-title">
                                                    {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </h3>
                                                <div className="day-bookings-list">
                                                    {dayBookings.map((booking, index) => (
                                                        <div key={index} className="booking-item">
                                                            <span className="booking-time">{booking.time}</span>
                                                            <span className="booking-court">{booking.court}</span>
                                                            <span className="booking-name">{booking.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'faq' && (
                        <div className="faq-section">
                            <div className="faq-list">
                                {faqData.map((faq, index) => (
                                    <div key={index} className="faq-item">
                                        <button 
                                            className={`faq-question ${activeFAQ === index ? 'active' : ''}`}
                                            onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                                        >
                                            {faq.question}
                                            <span className="faq-toggle">{activeFAQ === index ? '−' : '+'}</span>
                                        </button>
                                        {activeFAQ === index && (
                                            <div className="faq-answer">
                                                <p>{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
                {booking.comment ? (
                    <div className="booking-with-comment">
                        <div className="booking-left">
                            <span className="booked-time">{time}</span>
                            <span className="booked-name">{booking.name}</span>
                        </div>
                        <div className="booking-right">
                            <span className="booked-comment">{booking.comment}</span>
                        </div>
                    </div>
                ) : (
                    <div className="booking-no-comment">
                        <span>{time}</span>
                        <span className="booked-name">{booking.name}</span>
                    </div>
                )}
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
    const [loading, setLoading] = useState(true);
    const [modalSlot, setModalSlot] = useState<ModalSlot | null>(null);
    const [cancellationSlot, setCancellationSlot] = useState<CancellationModalData | null>(null);
    const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
    const [infoModalContent, setInfoModalContent] = useState<InfoModalContent | null>(null);
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    // Convert raw bookings to the format expected by the UI
    const convertBookingsToLegacyFormat = useCallback((bookings: Booking[]): AllBookings => {
        const result: AllBookings = {};
        
        bookings.forEach(booking => {
            if (!result[booking.date]) {
                result[booking.date] = {};
            }
            if (!result[booking.date][booking.court]) {
                result[booking.date][booking.court] = {};
            }
            result[booking.date][booking.court][booking.time] = {
                name: booking.name,
                comment: booking.comment || '',
                secretKey: booking.secret_key
            };
        });
        
        return result;
    }, []);

    // Load bookings with realtime listeners and fallback
    useEffect(() => {
        setLoading(true);
        const startDate = formatDateKey(weekDays[0]);
        const endDate = formatDateKey(weekDays[weekDays.length - 1]);
        
        let isSubscribed = true;
        let hasReceivedData = false;
        
        // Fallback function to load data manually if realtime fails
        const loadDataFallback = async () => {
            try {
                console.log('Attempting fallback data load...');
                const fetchedBookings = await BookingService.getBookings(startDate, endDate);
                if (isSubscribed) {
                    setBookings(convertBookingsToLegacyFormat(fetchedBookings));
                    setLoading(false);
                    hasReceivedData = true;
                }
            } catch (error) {
                console.error('Fallback data load failed:', error);
                if (isSubscribed) {
                    setInfoModalContent({
                        title: 'Error de Conexión',
                        message: 'No se pudieron cargar las reservas. Verifica tu conexión a internet.'
                    });
                    setLoading(false);
                }
            }
        };

        // Set up realtime listener
        const unsubscribe = BookingService.subscribeToBookings(
            startDate, 
            endDate, 
            (fetchedBookings) => {
                if (isSubscribed) {
                    console.log('Realtime data received:', fetchedBookings.length, 'bookings');
                    setBookings(convertBookingsToLegacyFormat(fetchedBookings));
                    setLoading(false);
                    hasReceivedData = true;
                }
            }
        );

        // Set up fallback timeout
        const fallbackTimeout = setTimeout(() => {
            if (!hasReceivedData && isSubscribed) {
                console.log('Realtime listener timeout, using fallback...');
                loadDataFallback();
            }
        }, 5000); // 5 seconds timeout

        return () => {
            isSubscribed = false;
            unsubscribe();
            clearTimeout(fallbackTimeout);
        };
    }, [weekDays, convertBookingsToLegacyFormat]);

    // Note: refreshBookings is no longer needed with realtime listeners
    // Bookings will update automatically when changes occur in Firestore
    
    const selectedDate = weekDays[selectedDayIndex] || weekDays[0];
    const dateKey = formatDateKey(selectedDate);

    const handleBookSlot = useCallback(async (bookingDetails: BookingSubmission) => {
        if (!modalSlot) return;
        const { court, time } = modalSlot;
        
        try {
            await BookingService.createBooking({
                court,
                date: dateKey,
                time,
                name: bookingDetails.name,
                comment: bookingDetails.comment,
                secret_key: bookingDetails.secretKey
            });
            
            // No need to refresh - realtime listener will update automatically
            setModalSlot(null);
            setSelectedCourt(court); // Stay on the court view
            
            setInfoModalContent({
                title: 'Reserva Confirmada',
                message: `Su reserva para la Pista ${court} el ${formatDateKey(modalSlot.date)} a las ${time} ha sido confirmada.`
            });
        } catch (error) {
            console.error("Failed to create booking", error);
            setInfoModalContent({
                title: 'Error en la Reserva',
                message: error instanceof Error ? error.message : 'No se pudo crear la reserva. Inténtelo de nuevo.'
            });
        }
    }, [modalSlot, dateKey]);

    const handleCancelBooking = useCallback(async (enteredKey: string) => {
        if (!cancellationSlot) return;

        const { date, court, time } = cancellationSlot;
        const keyForDate = formatDateKey(date);
        
        try {
            const bookingToCancel = await BookingService.findBooking(court, keyForDate, time);
            
            if (bookingToCancel && bookingToCancel.secret_key === enteredKey) {
                await BookingService.deleteBooking(bookingToCancel.id, enteredKey);
                // No need to refresh - realtime listener will update automatically
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
        } catch (error) {
            console.error("Failed to cancel booking", error);
            setInfoModalContent({
                title: 'Error al Cancelar',
                message: 'No se pudo cancelar la reserva. Inténtelo de nuevo.'
            });
        }
    }, [cancellationSlot]);

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
                    <img src="android-chrome-192x192-no-bg.png" alt="ValPadel Logo" className="logo-img" />
                    <h1 className="app-title">ValPadel</h1>
                </div>
                <div className="header-right">
                    <InstallPWA />
                    <button className="burger-menu-btn" onClick={() => setSideMenuOpen(true)}>
                        <BurgerIcon />
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="date-selector">
                    <button onClick={() => changeDay(-1)} disabled={selectedDayIndex === 0}>&lt;</button>
                    <span className="date-display">
                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <button onClick={() => changeDay(1)} disabled={selectedDayIndex === weekDays.length - 1}>&gt;</button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Cargando reservas...</p>
                    </div>
                ) : selectedCourt === null ? (
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

            <SideMenu
                isOpen={sideMenuOpen}
                onClose={() => setSideMenuOpen(false)}
                bookings={bookings}
                weekDays={weekDays}
            />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);