import { useState } from "react";

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export default function Calendar({ selectedDate, onSelectDate, availableDaysOfWeek = null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = domingo

  const isDisabled = (date) => {
    if (date < today) return true;
    if (!availableDaysOfWeek) return false;
    const dia = DIAS_SEMANA[date.getDay()];
    return !availableDaysOfWeek.has(dia);
  };

  const handleDayClick = (day) => {
    const clicked = new Date(year, month, day);
    if (isDisabled(clicked)) return;
    onSelectDate(clicked);
  };

  const atMinMonth = month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="w-full max-w-md p-4 mx-auto border sm:p-6 bg-ink2 border-white/10">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => {
            if (atMinMonth) return;
            setMonth(month === 0 ? 11 : month - 1);
            if (month === 0) setYear(year - 1);
          }}
          disabled={atMinMonth}
          className="px-2 py-1 text-sm transition-colors border sm:px-3 border-white/10 text-muted hover:border-red hover:text-red disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-muted"
        >
          ◀
        </button>

        <h2 className="text-sm capitalize sm:text-lg font-display text-paper">
          {new Date(year, month).toLocaleString("es-CL", { month: "long", year: "numeric" })}
        </h2>

        <button
          type="button"
          onClick={() => {
            setMonth(month === 11 ? 0 : month + 1);
            if (month === 11) setYear(year + 1);
          }}
          className="px-2 py-1 text-sm transition-colors border sm:px-3 border-white/10 text-muted hover:border-red hover:text-red"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2 text-xs tracking-widest text-center uppercase sm:text-sm text-muted">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => <div key={`empty-${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const disabled = isDisabled(date);
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === today.toDateString();

          return (
            <button
              type="button"
              key={day}
              onClick={() => handleDayClick(day)}
              disabled={disabled}
              className={`aspect-square flex items-center justify-center text-xs sm:text-sm transition-colors ${
                disabled
                  ? "text-white/15 cursor-not-allowed"
                  : isSelected
                  ? "bg-red text-white"
                  : "text-paper hover:bg-white/10"
              } ${isToday && !isSelected ? "border border-red/50" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}