'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Mail,
  Phone,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';
import { validateIndianMobile } from '@/lib/utils/phone';
import { formatIndianRupee } from '@/lib/utils/currency';

export type DocumentType = 'quotation' | 'invoice';

export interface DocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  isDraft: boolean;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  pdfUrl: string;
  dateStr: string;
  dueOrValidityStr: string;
  grandTotal: number;
  balanceAmount?: number;
  onRecordDelivery: (payload: {
    channel: 'whatsapp' | 'email' | 'phone' | 'in_person';
    recipientPhone?: string;
    recipientEmail?: string;
    notes?: string;
    status: 'sharing_initiated' | 'manually_sent' | 'logged';
    updateCustomerContact?: boolean;
  }) => Promise<{ success?: boolean; error?: string }>;
}

export default function DocumentShareModal({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentNumber,
  isDraft,
  customerName,
  customerPhone,
  customerEmail,
  pdfUrl,
  dateStr,
  dueOrValidityStr,
  grandTotal,
  balanceAmount,
  onRecordDelivery,
}: DocumentShareModalProps) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'manual'>('whatsapp');

  // WhatsApp form state
  const [phoneInput, setPhoneInput] = useState(customerPhone || '');
  const [phoneValidation, setPhoneValidation] = useState(validateIndianMobile(customerPhone || ''));
  const [updateCustomerPhone, setUpdateCustomerPhone] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  // Email form state
  const [emailInput, setEmailInput] = useState(customerEmail || '');
  const [emailError, setEmailError] = useState('');
  const [updateCustomerEmail, setUpdateCustomerEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Manual delivery state
  const [manualChannel, setManualChannel] = useState<'phone' | 'in_person'>('phone');
  const [manualNotes, setManualNotes] = useState('');

  // Step state
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [sharingInitiated, setSharingInitiated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | null>(null);

  // Initialize prefilled messages
  useEffect(() => {
    const formattedAmount = formatIndianRupee(grandTotal);
    const docLabel = documentType === 'invoice' ? 'Invoice' : 'Quotation';
    const draftNotice = isDraft ? ' [DRAFT PREVIEW — NOT FORMALLY ISSUED]' : '';

    if (documentType === 'invoice') {
      const formattedBalance = balanceAmount !== undefined ? formatIndianRupee(balanceAmount) : formattedAmount;
      const msg = `Hello ${customerName},

Please find the invoice details from Santhaya Associates Pvt. Ltd.${draftNotice}

Invoice No: ${documentNumber}
Invoice Date: ${dateStr}
Invoice Amount: ${formattedAmount}
Outstanding Balance: ${formattedBalance}

Please find the attached invoice PDF.

Thank you,
Santhaya Associates Pvt. Ltd.
Civil Engineering & Machinery Supply`;

      setWhatsAppMessage(msg);
      setEmailSubject(`Invoice ${documentNumber} — Santhaya Associates Pvt. Ltd.${draftNotice}`);
      setEmailBody(msg);
    } else {
      const msg = `Hello ${customerName},

Please find the commercial quotation details from Santhaya Associates Pvt. Ltd.${draftNotice}

Quotation No: ${documentNumber}
Quotation Date: ${dateStr}
Validity: ${dueOrValidityStr}
Quotation Amount: ${formattedAmount}

Please find the attached quotation PDF.

Thank you,
Santhaya Associates Pvt. Ltd.
Civil Engineering & Machinery Supply`;

      setWhatsAppMessage(msg);
      setEmailSubject(`Quotation ${documentNumber} — Santhaya Associates Pvt. Ltd.${draftNotice}`);
      setEmailBody(msg);
    }
  }, [documentType, documentNumber, isDraft, customerName, dateStr, dueOrValidityStr, grandTotal, balanceAmount]);

  // Update phone validation on change
  const handlePhoneChange = (val: string) => {
    setPhoneInput(val);
    setPhoneValidation(validateIndianMobile(val));
  };

  // Update email validation on change
  const handleEmailChange = (val: string) => {
    setEmailInput(val);
    if (!val.trim()) {
      setEmailError('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError('Invalid email format.');
    } else {
      setEmailError('');
    }
  };

  const handleDownloadPdf = () => {
    setPdfDownloaded(true);
    const win = window.open(pdfUrl, '_blank');
    if (win) win.focus();
  };

  const handleOpenWhatsApp = async () => {
    if (!phoneValidation.isValid || !phoneValidation.normalized) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setSharingInitiated(true);
    const encodedText = encodeURIComponent(whatsAppMessage);
    const waUrl = `https://wa.me/${phoneValidation.normalized}?text=${encodedText}`;

    // Record 'sharing_initiated'
    await onRecordDelivery({
      channel: 'whatsapp',
      recipientPhone: phoneValidation.normalized,
      notes: 'WhatsApp Web/App sharing link opened.',
      status: 'sharing_initiated',
      updateCustomerContact: updateCustomerPhone,
    });

    window.open(waUrl, '_blank');
  };

  const handleOpenEmail = async () => {
    if (!emailInput.trim() || emailError) {
      setStatusMessage({ type: 'error', text: 'Please provide a valid recipient email address.' });
      return;
    }

    setSharingInitiated(true);
    const mailtoUrl = `mailto:${encodeURIComponent(emailInput.trim())}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    // Record 'sharing_initiated'
    await onRecordDelivery({
      channel: 'email',
      recipientEmail: emailInput.trim(),
      notes: 'Default email application draft opened.',
      status: 'sharing_initiated',
      updateCustomerContact: updateCustomerEmail,
    });

    window.location.href = mailtoUrl;
  };

  const handleCopy = (field: 'subject' | 'body', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleConfirmSent = async (channel: 'whatsapp' | 'email') => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await onRecordDelivery({
        channel,
        recipientPhone: channel === 'whatsapp' ? phoneValidation.normalized || phoneInput : undefined,
        recipientEmail: channel === 'email' ? emailInput.trim() : undefined,
        notes: `Staff confirmed document sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email client'}.`,
        status: 'manually_sent',
        updateCustomerContact: channel === 'whatsapp' ? updateCustomerPhone : updateCustomerEmail,
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Recorded: Marked as manually sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}.`,
        });
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record delivery.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await onRecordDelivery({
        channel: manualChannel,
        notes: manualNotes.trim() || `Manual delivery recorded (${manualChannel}).`,
        status: 'logged',
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Manual delivery recorded successfully.`,
        });
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record manual handover.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#10243B] text-white p-4 sm:p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-400 text-slate-950">
                {documentType === 'invoice' ? 'GST Invoice' : 'Quotation'}
              </span>
              {isDraft && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Draft Proposal
                </span>
              )}
            </div>
            <h2 id="share-modal-title" className="text-lg sm:text-xl font-bold mt-1 tracking-tight text-white">
              Share {documentNumber}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Client: <strong className="text-white">{customerName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Share</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Email (Client)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-700" />
            <span>Manual Handover</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: WhatsApp Sharing */}
        {activeTab === 'whatsapp' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Recipient Phone with Validation */}
            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                Recipient Indian Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="e.g. 9430986713 or +91 94309 86713"
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                    phoneInput && !phoneValidation.isValid
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {phoneValidation.isValid && (
                  <span className="absolute right-3 top-2.5 text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {phoneValidation.displayFormatted}
                  </span>
                )}
              </div>
              {phoneInput && !phoneValidation.isValid && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{phoneValidation.error}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id="updatePhone"
                  checked={updateCustomerPhone}
                  onChange={(e) => setUpdateCustomerPhone(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="updatePhone" className="text-slate-600 text-[11px]">
                  Update saved customer phone number in database
                </label>
              </div>
            </div>

            {/* Editable WhatsApp Message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  WhatsApp Message Text
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy('body', whatsAppMessage)}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedField === 'body' ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
              <textarea
                rows={5}
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 5-Step Execution Workflow (BUG-058) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                How to Share via WhatsApp (5-Step Guide)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Step 1: Download */}
                <div
                  className={`p-2.5 rounded-lg border transition ${
                    pdfDownloaded
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 1: Download PDF</span>
                    {pdfDownloaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#10243B] text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Step 2: Open WhatsApp */}
                <div
                  className={`p-2.5 rounded-lg border transition ${
                    sharingInitiated
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 2: Open WhatsApp</span>
                    {sharingInitiated && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <button
                    type="button"
                    disabled={!phoneValidation.isValid}
                    onClick={handleOpenWhatsApp}
                    className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Step 3 & 4: Instructions */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong className="text-slate-800">Step 3: Attach PDF Document:</strong> Windows: Drag the downloaded PDF from your browser bar or Downloads folder. Android: Tap paperclip 📎 → Document → select PDF from Downloads / Files.
                </p>
                <p>
                  <strong className="text-slate-800">Step 4: Send to Client:</strong> Review message with client and send.
                </p>
              </div>

              {/* Manual Transmission Disclaimer */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                <strong>Manual Transmission Disclaimer:</strong> Document dispatch via external WhatsApp or Email clients is handled directly by staff outside this application. Confirming marks the record as manually sent by your staff account.
              </div>

              {/* Step 5: Record Attestation */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Step 5: Confirm Manually Sent in ERP</span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmSent('whatsapp')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Recording...' : 'Confirm Manually Sent'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Email Sharing (Client App) */}
        {activeTab === 'email' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Recipient Email Address */}
            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                Recipient Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="client@company.com"
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                  emailError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {emailError && <p className="text-red-600 text-[11px] mt-1 font-medium">{emailError}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id="updateEmail"
                  checked={updateCustomerEmail}
                  onChange={(e) => setUpdateCustomerEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="updateEmail" className="text-slate-600 text-[11px]">
                  Update saved customer email in database
                </label>
              </div>
            </div>

            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Email Subject</label>
                <button
                  type="button"
                  onClick={() => handleCopy('subject', emailSubject)}
                  className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedField === 'subject' ? 'Copied!' : 'Copy Subject'}
                </button>
              </div>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Email Body</label>
                <button
                  type="button"
                  onClick={() => handleCopy('body', emailBody)}
                  className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedField === 'body' ? 'Copied!' : 'Copy Body'}
                </button>
              </div>
              <textarea
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 5-Step Execution Workflow (BUG-058) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                How to Share via Email Client (5-Step Guide)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Step 1: Download */}
                <div
                  className={`p-2.5 rounded-lg border transition ${
                    pdfDownloaded ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 1: Download PDF</span>
                    {pdfDownloaded && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#10243B] text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Step 2: Open Email */}
                <div
                  className={`p-2.5 rounded-lg border transition ${
                    sharingInitiated ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 2: Open Mail Draft</span>
                    {sharingInitiated && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <button
                    type="button"
                    disabled={!emailInput.trim() || !!emailError}
                    onClick={handleOpenEmail}
                    className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Email App</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong className="text-slate-800">Step 3: Attach PDF Document:</strong> Windows: Drag the downloaded PDF from your browser bar or Downloads folder. Android: Tap paperclip 📎 → Attach file → select PDF from Downloads / Files.
                </p>
                <p>
                  <strong className="text-slate-800">Step 4: Send to Client:</strong> Send from your configured corporate email client.
                </p>
              </div>

              {/* Manual Transmission Disclaimer */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                <strong>Manual Transmission Disclaimer:</strong> Document dispatch via external WhatsApp or Email clients is handled directly by staff outside this application. Confirming marks the record as manually sent by your staff account.
              </div>

              {/* Step 5: Record Attestation */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Step 5: Confirm Manually Sent in ERP</span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmSent('email')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Recording...' : 'Confirm Manually Sent'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Manual Handover */}
        {activeTab === 'manual' && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                Handover Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={manualChannel}
                onChange={(e) => setManualChannel(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                <option value="phone">Phone Discussion / Quoted</option>
                <option value="in_person">In-Person Handover / Printed Copy</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                Handover Notes / Remarks
              </label>
              <textarea
                rows={3}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g. Discussed pricing with Er. Rajesh Sharma over telephone call. Client requested final revision."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Recording a manual handover creates an immutable staff audit log entry with your credentials and timestamp.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleManualSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10243B] text-white rounded-lg font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Recording...' : 'Record Manual Handover'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Santhaya Associates Document Transmission</span>
          <span>Zero Paid APIs Required</span>
        </div>
      </div>
    </div>
  );
}
