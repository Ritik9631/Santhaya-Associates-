/**
 * Santhaya Associates — Reusable Form Input Styling System (WCAG AA Compliant)
 * File: src/components/ui/form-styles.ts
 *
 * Ensures dark text (#0f172a / slate-900) on light input surfaces across all native
 * text, date, number, select, and textarea controls, preventing inherited white-on-white text.
 */

export const formInputClasses =
  'w-full text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-2.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#10243B] focus:border-[#10243B] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

export const formSelectClasses =
  'w-full text-sm rounded-lg border border-slate-300 bg-white text-slate-900 p-2.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#10243B] focus:border-[#10243B] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

export const formTextareaClasses =
  'w-full text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-2.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#10243B] focus:border-[#10243B] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

export const formLabelClasses =
  'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

export const tableInputClasses =
  'w-full text-xs rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-2 focus:outline-none focus:ring-1 focus:ring-[#10243B] focus:border-[#10243B] disabled:bg-slate-100 disabled:text-slate-500';

export const tableSelectClasses =
  'w-full text-xs rounded border border-slate-300 bg-white text-slate-900 p-2 focus:outline-none focus:ring-1 focus:ring-[#10243B] focus:border-[#10243B] disabled:bg-slate-100 disabled:text-slate-500';

