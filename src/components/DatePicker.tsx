import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  minYear?: number;
  maxYear?: number;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  minYear = 1900, 
  maxYear = new Date().getFullYear() 
}) => {
  const day = value?.getDate();
  const month = value ? value.getMonth() + 1 : undefined;
  const year = value?.getFullYear();

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const getDaysInMonth = (m: number, y: number) => {
    return new Date(y, m, 0).getDate();
  };

  const currentMonth = month || 1;
  const currentYear = year || maxYear;
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);

  const handleDayChange = (d: string) => {
    const newDay = parseInt(d);
    const newDate = new Date(currentYear, (month || 1) - 1, newDay);
    onChange(newDate);
  };

  const handleMonthChange = (m: string) => {
    const newMonth = parseInt(m);
    const maxDayInNewMonth = getDaysInMonth(newMonth, currentYear);
    const newDay = Math.min(day || 1, maxDayInNewMonth);
    const newDate = new Date(currentYear, newMonth - 1, newDay);
    onChange(newDate);
  };

  const handleYearChange = (y: string) => {
    const newYear = parseInt(y);
    const maxDayInMonth = getDaysInMonth(currentMonth, newYear);
    const newDay = Math.min(day || 1, maxDayInMonth);
    const newDate = new Date(newYear, currentMonth - 1, newDay);
    onChange(newDate);
  };

  return (
    <div className="flex gap-2 w-full">
      <Select value={month?.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="flex-1 h-12 rounded-xl">
          <SelectValue placeholder="Mese" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {months.map((m, idx) => (
            <SelectItem key={idx + 1} value={(idx + 1).toString()}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={day?.toString()} onValueChange={handleDayChange}>
        <SelectTrigger className="w-20 h-12 rounded-xl">
          <SelectValue placeholder="Giorno" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year?.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-24 h-12 rounded-xl">
          <SelectValue placeholder="Anno" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
