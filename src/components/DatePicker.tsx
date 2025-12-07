import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  minYear?: number;
  maxYear?: number;
}

// Month translations for all supported languages
const monthTranslations: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};

const placeholderTranslations: Record<string, { month: string; day: string; year: string }> = {
  en: { month: 'Month', day: 'Day', year: 'Year' },
  it: { month: 'Mese', day: 'Giorno', year: 'Anno' },
  es: { month: 'Mes', day: 'Día', year: 'Año' },
  fr: { month: 'Mois', day: 'Jour', year: 'Année' },
  de: { month: 'Monat', day: 'Tag', year: 'Jahr' },
  pt: { month: 'Mês', day: 'Dia', year: 'Ano' },
  'zh-CN': { month: '月', day: '日', year: '年' },
  ja: { month: '月', day: '日', year: '年' },
  ko: { month: '월', day: '일', year: '년' },
  ar: { month: 'شهر', day: 'يوم', year: 'سنة' },
  hi: { month: 'महीना', day: 'दिन', year: 'वर्ष' },
  ru: { month: 'Месяц', day: 'День', year: 'Год' },
};

const getMonths = (lang: string): string[] => {
  const normalizedLang = lang.includes('-') && !monthTranslations[lang] 
    ? lang.split('-')[0] 
    : lang;
  return monthTranslations[normalizedLang] || monthTranslations['en'];
};

const getPlaceholders = (lang: string) => {
  const normalizedLang = lang.includes('-') && !placeholderTranslations[lang] 
    ? lang.split('-')[0] 
    : lang;
  return placeholderTranslations[normalizedLang] || placeholderTranslations['en'];
};

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  minYear = 1900, 
  maxYear = new Date().getFullYear() 
}) => {
  const { i18n } = useTranslation();
  
  const day = value?.getDate();
  const month = value ? value.getMonth() + 1 : undefined;
  const year = value?.getFullYear();

  const months = getMonths(i18n.language);
  const placeholders = getPlaceholders(i18n.language);

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
          <SelectValue placeholder={placeholders.month} />
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
          <SelectValue placeholder={placeholders.day} />
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
          <SelectValue placeholder={placeholders.year} />
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