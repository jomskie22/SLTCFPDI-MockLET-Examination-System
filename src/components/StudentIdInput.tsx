import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Hash, Calendar } from 'lucide-react';

interface StudentIdInputProps {
  value: string; // e.g. "SLPD-2024-COL-0190" or empty
  onChange: (fullStudentId: string, isValid: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  autoFocus?: boolean;
}

export const StudentIdInput: React.FC<StudentIdInputProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Official Student ID Number',
  helperText,
  autoFocus = false,
}) => {
  // Parse incoming value into year & number
  const parseValue = (val: string): { year: string; number: string } => {
    if (!val) return { year: '', number: '' };
    // Try matching SLPD-YYYY-COL-NNNN
    const match = val.match(/^SLPD-([0-9]{0,4})-COL-([0-9A-Z]{0,4})$/i);
    if (match) {
      return { year: match[1] || '', number: match[2] || '' };
    }
    // Try matching YYYY-NNNN or general digits
    const digits = val.replace(/[^0-9]/g, '');
    if (digits.length >= 8) {
      return { year: digits.slice(0, 4), number: digits.slice(4, 8) };
    }
    return { year: '', number: '' };
  };

  const parsed = parseValue(value);
  const [year, setYear] = useState<string>(parsed.year);
  const [number, setNumber] = useState<string>(parsed.number);

  const yearInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes if different
  useEffect(() => {
    const currentConstructed = (year && number) ? `SLPD-${year}-COL-${number}` : '';
    if (value && value !== currentConstructed) {
      const p = parseValue(value);
      setYear(p.year);
      setNumber(p.number);
    }
  }, [value]);

  const updateStudentId = (newYear: string, newNumber: string) => {
    const cleanYear = newYear.replace(/[^0-9]/g, '').slice(0, 4);
    const cleanNumber = newNumber.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(cleanYear);
    setNumber(cleanNumber);

    const full = `SLPD-${cleanYear}-COL-${cleanNumber}`;
    const isValid = cleanYear.length === 4 && cleanNumber.length === 4;
    onChange(isValid ? full : (cleanYear || cleanNumber ? full : ''), isValid);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
    updateStudentId(digits, number);

    // Auto-advance to number input when 4 digits entered
    if (digits.length === 4 && numberInputRef.current) {
      numberInputRef.current.focus();
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
    updateStudentId(year, digits);
  };

  // Handle paste anywhere in the component
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Check if full format like SLPD-2024-COL-0190
    const fullMatch = pasted.trim().match(/SLPD-?([0-9]{4})-?COL-?([0-9]{4})/i);
    if (fullMatch) {
      e.preventDefault();
      updateStudentId(fullMatch[1], fullMatch[2]);
      if (numberInputRef.current) numberInputRef.current.focus();
      return;
    }

    // Check if pure 8 digits e.g. 20240190
    const cleanDigits = pasted.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 8) {
      e.preventDefault();
      updateStudentId(cleanDigits.slice(0, 4), cleanDigits.slice(4, 8));
      if (numberInputRef.current) numberInputRef.current.focus();
    }
  };

  const handleKeyDownNumber = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !number && yearInputRef.current) {
      yearInputRef.current.focus();
    }
  };

  const isComplete = year.length === 4 && number.length === 4;
  const fullConstructed = isComplete ? `SLPD-${year}-COL-${number}` : '';

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            {label} <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            Format: <strong className="text-blue-700">SLPD-YYYY-COL-NNNN</strong>
          </span>
        </div>
      )}

      {/* Segmented Input Box */}
      <div
        className={`flex items-stretch rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${
          disabled ? 'opacity-60 bg-slate-50 border-slate-200' :
          isComplete ? 'border-emerald-500 ring-2 ring-emerald-100' :
          'border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
        }`}
      >
        {/* Fixed Non-Editable Prefix "SLPD" */}
        <div
          title="Fixed Institution Prefix: Southern Luzon Polytechnic / Pio Duran"
          className="flex items-center justify-center px-3.5 bg-slate-100 border-r border-slate-200 text-slate-800 font-mono font-black text-sm select-none tracking-wider shrink-0"
        >
          SLPD
        </div>

        {/* Enrollment Year Input */}
        <div className="relative flex-1 min-w-[70px]">
          <input
            ref={yearInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={year}
            onChange={handleYearChange}
            onPaste={handlePaste}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder="2024"
            className="w-full h-11 px-2.5 text-center font-mono text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-blue-50/40 transition"
            title="4-digit enrollment or admission year"
          />
          <span className="absolute bottom-1 left-0 right-0 text-[9px] text-center text-slate-400 font-medium pointer-events-none uppercase">
            Year
          </span>
        </div>

        {/* Fixed Non-Editable Middle "COL" */}
        <div
          title="Fixed Division Code: College Department"
          className="flex items-center justify-center px-3 bg-slate-100 border-x border-slate-200 text-slate-800 font-mono font-black text-sm select-none tracking-wider shrink-0"
        >
          COL
        </div>

        {/* Student Specific Number Input */}
        <div className="relative flex-1 min-w-[70px]">
          <input
            ref={numberInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={number}
            onChange={handleNumberChange}
            onKeyDown={handleKeyDownNumber}
            onPaste={handlePaste}
            disabled={disabled}
            placeholder="0190"
            className="w-full h-11 px-2.5 text-center font-mono text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-blue-50/40 transition"
            title="4-digit student individual number"
          />
          <span className="absolute bottom-1 left-0 right-0 text-[9px] text-center text-slate-400 font-medium pointer-events-none uppercase">
            Student No.
          </span>
        </div>

        {/* Status indicator on right */}
        <div className="flex items-center px-3 bg-slate-50 border-l border-slate-200 shrink-0">
          {isComplete ? (
            <span title="Valid Student ID format" className="flex items-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          ) : (
            <span title="Enter 4-digit Year and 4-digit Student No." className="text-slate-300 font-mono text-xs">
              {4 - year.length + (4 - number.length)} left
            </span>
          )}
        </div>
      </div>

      {/* Helper text or live preview */}
      <div className="flex items-center justify-between text-[11px] px-1">
        {isComplete ? (
          <p className="text-emerald-700 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Constructed ID: <strong className="font-mono text-xs text-slate-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{fullConstructed}</strong></span>
          </p>
        ) : (
          <p className="text-slate-500">
            {helperText || 'Enter your 4-digit admission year and 4-digit student number.'}
          </p>
        )}
        <span className="text-slate-400 font-mono text-[10px]">e.g. SLPD-2024-COL-0190</span>
      </div>
    </div>
  );
};
