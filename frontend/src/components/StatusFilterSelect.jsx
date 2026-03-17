import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Inbox, Clock, CheckCircle, XCircle, ListFilter } from 'lucide-react';
import { cn } from '../lib/utils';

const TICKET_OPTIONS = [
  { value: 'Baru', label: 'Baru', Icon: Inbox },
  { value: 'Diproses', label: 'Diproses', Icon: Clock },
  { value: 'Selesai', label: 'Selesai', Icon: CheckCircle },
  { value: 'Batal', label: 'Batal', Icon: XCircle },
];

const ACTIVITY_OPTIONS = [
  { value: 'diproses', label: 'Diproses', Icon: Clock },
  { value: 'selesai', label: 'Selesai', Icon: CheckCircle },
  { value: 'batal', label: 'Batal', Icon: XCircle },
];

/**
 * Dropdown filter status dengan icon per opsi.
 * @param {'ticket'|'activity'} variant - 'ticket' = Baru, Diproses, Selesai, Batal; 'activity' = diproses, selesai, batal
 * @param {string} value - nilai terpilih (atau '' untuk Semua Status)
 * @param {function} onChange - (value: string) => void
 * @param {boolean} [includeBaru] - untuk variant ticket, sertakan opsi Baru (default true)
 * @param {boolean} [showAllOption] - tampilkan opsi "Semua Status" (default true, false untuk form ubah status)
 * @param {string} [id] - id untuk a11y
 * @param {string} [ariaLabel] - aria-label
 * @param {string} [className] - class tambahan
 */
export function StatusFilterSelect({
  variant = 'ticket',
  value,
  onChange,
  includeBaru = true,
  showAllOption = true,
  id,
  ariaLabel = 'Filter status',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const options =
    variant === 'activity'
      ? ACTIVITY_OPTIONS
      : includeBaru
        ? TICKET_OPTIONS
        : TICKET_OPTIONS.filter((o) => o.value !== 'Baru');
  const selectedOption = value ? options.find((o) => o.value === value) : null;
  const displayLabel = selectedOption ? selectedOption.label : (showAllOption ? 'Semua Status' : (options[0]?.label ?? ''));
  const DisplayIcon = selectedOption ? selectedOption.Icon : ListFilter;

  // Ukur posisi trigger saat dropdown dibuka (untuk portal dengan position: fixed)
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const el = triggerRef.current;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const insideTrigger = containerRef.current?.contains(e.target);
      const insideDropdown = dropdownRef.current?.contains(e.target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  const dropdownList = open ? (
    <ul
      ref={dropdownRef}
      role="listbox"
      aria-label={ariaLabel}
      className="fixed z-[9999] mt-1 min-w-[10rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
      style={{
        top: position.top + 4,
        left: position.left,
        width: position.width,
      }}
    >
      {showAllOption && (
        <li role="option" aria-selected={!value}>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => handleSelect('')}
          >
            <ListFilter className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            Semua Status
          </button>
        </li>
      )}
      {options.map((opt) => {
        const Icon = opt.Icon;
        const isSelected = value === opt.value;
        return (
          <li key={opt.value} role="option" aria-selected={isSelected}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => handleSelect(opt.value)}
            >
              <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              {opt.label}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left ring-offset-white transition-colors',
          'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span id={id ? `${id}-label` : undefined} className="flex items-center gap-2 truncate">
          <DisplayIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          {displayLabel}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {typeof document !== 'undefined' && dropdownList && createPortal(dropdownList, document.body)}
    </div>
  );
}
