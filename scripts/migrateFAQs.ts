import { FAQService } from '../lib/faqService';

const faqData = [
    {
        question: "Veo un botón de Instalar ¿Tengo que instalarla?",
        answer: "No tienes porqué, pero es lo recomendable. El diseño está optimizado para ser instalado, tendrás una mejor experiencia de uso, verás un icono en tu móvil como el de cualquier otra app. Realmente es un acceso directo a la web con una experiencia de app, apenas ocupa espacio.",
        order: 1
    },
    {
        question: "¿Cómo hago una reserva?",
        answer: "Selecciona el día, luego la pista y finalmente la hora disponible. Rellena el formulario con tu nombre, una clave de 6 dígitos y opcionalmente un comentario.",
        order: 2
    },
    {
        question: "¿Puedo cancelar mi reserva?",
        answer: "Sí, puedes cancelar tu reserva haciendo clic en tu franja horaria reservada e introduciendo la clave de 6 dígitos que usaste al reservar.",
        order: 3
    },
    {
        question: "¿Cuándo puedo reservar?",
        answer: "Las reservas de cada semana se abren cada lunes a las 00:00. Puedes reservar para cualquier día de la semana actual. Las franjas de reservas van desde las 9:00 hasta las 22:30.",
        order: 4
    },
    {
        question: "¿Qué pasa si olvido mi clave?",
        answer: "La clave es necesaria para cancelar reservas. Si la olvidas y quieres cancelar, intenta comunicarlo en los grupos de Whatsapp de pádel de la comunidad.",
        order: 5
    },
    {
        question: "¿Puedo reservar dos franjas seguidas de una pista?",
        answer: "Como poder, la aplicación lo permite, pero no es lo ideal. Excepcionalmente en épocas de calor, si quieres empezar a las 20:00 en vez de a las 19:30 por ejemplo, reserva a las 19:30 y deja un comentario avisando que comienzas a las 20:00 (siempre y cuando la franja de las 21:00 no esté ya reservada en ese momento).",
        order: 6
    },
    {
        question: "Quiero reservar todos los Martes a las 21:00, ¿no puedo?",
        answer: "No de forma automática. Tendrás que hacer una nueva reserva cada semana.",
        order: 7
    },
    {
        question: "¿Cómo enciendo los focos?",
        answer: "Necesitas contactar con Jesús de mantenimiento: 627 379 127. Él te facilitará unas fichas a 2€ cada una para 1,5 horas de luz. Justo frente a la puerta de la pista 3 verás temporizadores, asegúrate de echar la ficha en el que corresponde al número de tu pista.",
        order: 8
    }
];

export const migrateFAQs = async () => {
    console.log('Starting FAQ migration...');
    
    try {
        for (const faq of faqData) {
            const id = await FAQService.addFAQ(faq.question, faq.answer, faq.order);
            console.log(`Added FAQ: ${faq.question.substring(0, 50)}... (ID: ${id})`);
        }
        
        console.log('FAQ migration completed successfully!');
    } catch (error) {
        console.error('Error migrating FAQs:', error);
    }
};

// Run if this script is called directly
if (typeof window === 'undefined') {
    migrateFAQs();
}