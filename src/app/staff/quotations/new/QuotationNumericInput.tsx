'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  finalizeNumericInputOnBlur,
  normalizeNumericInputString,
  parseNumericInputValue,
  shouldAutoSelectOnFocus,
} from '@/lib/utils/numeric-input';

interface QuotationNumericInputProps {
  value: number;
  onValueChange: (nextValue: number) => void;
  allowDecimal?: boolean;
  allowEmpty?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
}

/**
 * QuotationNumericInput — High-reliability numeric input for Quotation Line Items & Validity.
 *
 * Solves sticky-zero UX ("02500", "0200") across desktop mouse clicks, keyboard Tab navigation,
 * clipboard paste, and mobile touch keypads without interfering with cursor movement, selection,
 * decimals ("2500.75"), intentional zeros ("0"), or empty optional fields (Discount).
 */
export default function QuotationNumericInput({
  value,
  onValueChange,
  allowDecimal = true,
  allowEmpty = false,
  defaultValue = 0,
  min,
  max,
  required = false,
  placeholder,
  className,
  ariaLabel,
  name,
  id,
}: QuotationNumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    Number.isFinite(value) ? String(value) : allowEmpty ? '' : String(defaultValue)
  );
  const pendingSelectOnMouseUpRef = useRef(false);

  // Sync display string ONLY when external prop diverges from the current numeric interpretation
  // (e.g., Catalog autofill or row updates), preserving live editing states like "", "2500.", "0.50"
  useEffect(() => {
    const currentParsed = parseNumericInputValue(displayValue, defaultValue);
    if (currentParsed !== value) {
      setDisplayValue(Number.isFinite(value) ? String(value) : allowEmpty ? '' : String(defaultValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (shouldAutoSelectOnFocus(e.currentTarget.value)) {
      pendingSelectOnMouseUpRef.current = true;
      const inputEl = e.currentTarget;
      inputEl.select();
      // Mobile browsers sometimes place the caret after synchronous focus; re-apply on next frame
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (document.activeElement === inputEl && shouldAutoSelectOnFocus(inputEl.value)) {
            inputEl.select();
          }
        });
      }
    } else {
      pendingSelectOnMouseUpRef.current = false;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (pendingSelectOnMouseUpRef.current) {
      e.preventDefault();
      pendingSelectOnMouseUpRef.current = false;
    }
  };

  const handleKeyDown = () => {
    pendingSelectOnMouseUpRef.current = false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pendingSelectOnMouseUpRef.current = false;
    const normalized = normalizeNumericInputString(e.target.value, { allowDecimal });
    setDisplayValue(normalized);
    const parsed = parseNumericInputValue(normalized, defaultValue);
    onValueChange(parsed);
  };

  const handleBlur = () => {
    pendingSelectOnMouseUpRef.current = false;
    const finalized = finalizeNumericInputOnBlur(displayValue, {
      allowDecimal,
      allowEmpty,
      defaultValue,
      min,
      max,
    });
    setDisplayValue(finalized.display);
    if (finalized.numeric !== value) {
      onValueChange(finalized.numeric);
    }
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      spellCheck={false}
      required={required}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={displayValue}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
