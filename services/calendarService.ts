
import { VisitRoute } from '@/types';

/**
 * Gera um link direto para criar um evento no Google Agenda
 */
export const getGoogleCalendarUrl = (date: string, route: VisitRoute) => {
  const cleanDate = date.replace(/-/g, '');
  const startTime = '090000'; // 09:00 AM
  const endTime = '100000';   // 10:00 AM
  
  const title = encodeURIComponent(`GVP: Visita - ${route.name}`);
  const details = encodeURIComponent(`Visita hospitalar do Grupo GVP.\n\nHospitais incluídos nesta rota:\n- ${route.hospitals.join('\n- ')}`);
  const dates = `${cleanDate}T${startTime}Z/${cleanDate}T${endTime}Z`;

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&sf=true&output=xml`;
};

/**
 * Gera e faz o download de um arquivo .ics (padrão universal)
 */
export const downloadIcsFile = (date: string, route: VisitRoute) => {
  const cleanDate = date.replace(/-/g, '');
  const startTime = '090000';
  const endTime = '100000';
  
  const title = `GVP: Visita - ${route.name}`;
  const description = `Visita hospitalar do Grupo GVP.\nHospitais: ${route.hospitals.join(', ')}`;
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GVP Litoral Sul//Portal de Visitas//PT',
    'BEGIN:VEVENT',
    `DTSTART:${cleanDate}T${startTime}Z`,
    `DTEND:${cleanDate}T${endTime}Z`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'DESCRIPTION:Lembrete de Visita GVP',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `visita-gvp-${date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
