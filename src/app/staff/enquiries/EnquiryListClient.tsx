'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  X,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import { updateEnquiryStatusAction } from '@/lib/enquiries/actions';
import type { QuotationRequestStatus, ServiceCategory } from '@/types/database';

export interface EnquiryItem {
  id: string;
  reference_number: string;
  business_name: string;
  contact_person: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  service_category: ServiceCategory;
  requirement_details: string;
  quantity: string | null;
  technical_specs?: string | null;
  technicalSpecs?: string | null;
  delivery_location: string;
  notes: string | null;
  status: QuotationRequestStatus;
  created_at: string;
  updated_at: string;
}

interface EnquiryListClientProps {
  enquiries: EnquiryItem[];
  canManage: boolean;
}

const statusConfig: Record<
  QuotationRequestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  new: { label: 'New Intake', bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-500/30' },
  under_review: { label: 'Under Review', bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-500/30' },
  quotation_drafted: { label: 'Quotation Drafted', bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-500/30' },
  rejected: { label: 'Rejected', bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-500/30' },
  archived: { label: 'Archived', bg: 'bg-slate-800/40', text: 'text-slate-400', border: 'border-slate-700' },
};

const categoryLabels: Record<string, string> = {
  construction_tenders: 'Construction Tenders',
  'construction-tenders': 'Construction Tenders',
  construction_machinery: 'Construction Machinery',
  'construction-machinery': 'Construction Machinery',
  manufacturing_machinery: 'Manufacturing Machinery',
  'manufacturing-machinery': 'Manufacturing Machinery',
};

export function EnquiryListClient({ enquiries, canManage }: EnquiryListClientProps) {
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCopy = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedId(ref);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (enquiryId: string, newStatus: QuotationRequestStatus) => {
    setActionError(null);
    setUpdating(true);
    const res = await updateEnquiryStatusAction(enquiryId, newStatus);
    setUpdating(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
        setSelectedEnquiry({ ...selectedEnquiry, status: newStatus });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Enquiry Cards Table/List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        {enquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Inbox className="w-10 h-10 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium">No inbound enquiries match the active criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {enquiries.map((item) => {
              const status = statusConfig[item.status] || statusConfig.new;
              const formattedDate = new Date(item.created_at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-5 hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Column: Reference, Business, Contact */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gold-400 bg-gold-950/40 border border-gold-500/20 px-2 py-0.5 rounded">
                        {item.reference_number}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.bg} ${status.text} ${status.border}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {categoryLabels[item.service_category] || item.service_category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <h3 className="text-sm font-bold text-white truncate">{item.business_name}</h3>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-xs text-slate-300 truncate">{item.contact_person}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex items-center gap-1 hover:text-gold-400 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-gold-500" />
                          <span>+91 {item.phone}</span>
                        </a>
                      )}
                      {item.email && (
                        <a
                          href={`mailto:${item.email}`}
                          className="flex items-center gap-1 hover:text-gold-400 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-gold-500" />
                          <span>{item.email}</span>
                        </a>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.delivery_location}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formattedDate} IST</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Quick Actions */}
                  <div className="flex items-center gap-2.5 flex-shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.reference_number)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                      title="Copy Reference"
                    >
                      {copiedId === item.reference_number ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ref</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEnquiry(item)}
                      className="px-3 py-1.5 rounded-lg border border-gold-500/40 bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-gold-400 bg-gold-950/60 border border-gold-500/30 px-2.5 py-0.5 rounded">
                    {selectedEnquiry.reference_number}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      statusConfig[selectedEnquiry.status].bg
                    } ${statusConfig[selectedEnquiry.status].text} ${
                      statusConfig[selectedEnquiry.status].border
                    }`}
                  >
                    {statusConfig[selectedEnquiry.status].label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedEnquiry.business_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Primary Contact Person
                </span>
                <span className="text-slate-200 font-semibold">{selectedEnquiry.contact_person}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Service Category
                </span>
                <span className="text-slate-200 font-semibold">
                  {categoryLabels[selectedEnquiry.service_category] || selectedEnquiry.service_category}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Phone Number
                </span>
                {selectedEnquiry.phone ? (
                  <a href={`tel:${selectedEnquiry.phone}`} className="text-gold-400 font-semibold hover:underline">
                    +91 {selectedEnquiry.phone}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">None Provided</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Official Email
                </span>
                {selectedEnquiry.email ? (
                  <a href={`mailto:${selectedEnquiry.email}`} className="text-gold-400 font-semibold hover:underline">
                    {selectedEnquiry.email}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">None Provided</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Delivery Location / Site
                </span>
                <span className="text-slate-200">{selectedEnquiry.delivery_location}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                  Statutory GSTIN
                </span>
                <span className="font-mono text-slate-200">{selectedEnquiry.gstin || 'Unspecified'}</span>
              </div>
            </div>

            {/* Scope / Requirement Text */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gold-500" />
                Project / Item Requirement Details
              </span>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedEnquiry.requirement_details}
              </div>
            </div>

            {(selectedEnquiry.quantity || selectedEnquiry.technical_specs || selectedEnquiry.technicalSpecs) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {selectedEnquiry.quantity && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Estimated Quantity</span>
                    <span className="text-slate-300 font-semibold">{selectedEnquiry.quantity}</span>
                  </div>
                )}
                {(selectedEnquiry.technical_specs || selectedEnquiry.technicalSpecs) && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Technical Specs</span>
                    <span className="text-slate-300">
                      {selectedEnquiry.technical_specs || selectedEnquiry.technicalSpecs}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Triage Status Management */}
            {canManage && (
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Triage Status Action:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['new', 'under_review', 'quotation_drafted', 'rejected', 'archived'] as QuotationRequestStatus[]).map(
                    (st) => {
                      const isActive = selectedEnquiry.status === st;
                      const cfg = statusConfig[st];
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={updating || isActive}
                          onClick={() => handleStatusChange(selectedEnquiry.id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isActive
                              ? `${cfg.bg} ${cfg.text} border ${cfg.border} ring-1 ring-gold-500/40`
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                          } disabled:opacity-50`}
                        >
                          {cfg.label}
                        </button>
                      );
                    }
                  )}
                  {updating && <Loader2 className="w-4 h-4 text-gold-400 animate-spin ml-2" />}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => handleCopy(selectedEnquiry.reference_number)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                {copiedId === selectedEnquiry.reference_number ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Reference Number</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

