'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    question: 'What services does Santhaya Associates provide?',
    answer:
      'Santhaya Associates Pvt. Ltd. provides specialized industrial services across three core domains: Government and private construction tender bidding, construction machinery supply for infrastructure sites, and industrial manufacturing machinery procurement.',
  },
  {
    question: 'Do you work with government and private construction tenders?',
    answer:
      'Yes. We participate in and support both public sector tenders (such as PWD, CPWD, and municipal works) as well as private commercial infrastructure bidding, ensuring complete technical documentation and BOQ compliance.',
  },
  {
    question: 'Can I enquire about construction machinery supply?',
    answer:
      'Yes. We supply heavy construction machinery including earthmoving fleets, excavators, transit mixers, batching plants, and lifting cranes tailored to specific project timelines and site specifications.',
  },
  {
    question: 'Do you also provide manufacturing machinery solutions?',
    answer:
      'Yes. We source and supply industrial manufacturing equipment, CNC tooling, automated production machinery, and plant assembly units for manufacturing and industrial facilities.',
  },
  {
    question: 'How can I request a quotation?',
    answer:
      'You can submit your requirements through our online Request a Quotation portal, detailing your project scope or equipment specifications. Alternatively, you can contact our desk directly via Call or WhatsApp for urgent requirements.',
  },
  {
    question: 'How can I contact your team directly?',
    answer:
      'You can reach our team directly by phone at +91 9430986713, message us on WhatsApp at +91 9608950748, email us at santhayapvt.ltd@gmail.com, or visit our registered office at Gopalpur, Motihari, Bihar – 845401.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default for discoverability

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {FAQ_DATA.map((item, index) => {
        const isOpen = openIndex === index;
        const answerId = `faq-answer-${index}`;
        const questionId = `faq-question-${index}`;

        return (
          <div
            key={index}
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'bg-white border-gold-500/50 shadow-md ring-1 ring-gold-500/20'
                : 'bg-white/80 border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-sm'
            }`}
          >
            <h3>
              <button
                type="button"
                id={questionId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => toggleItem(index)}
                className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-inset"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold transition-colors ${
                      isOpen
                        ? 'bg-navy-900 text-gold-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-navy-950">
                    {item.question}
                  </span>
                </span>
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                    isOpen
                      ? 'bg-gold-500 text-navy-950 rotate-180'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </button>
            </h3>

            <div
              id={answerId}
              role="region"
              aria-labelledby={questionId}
              className={`transition-all duration-200 ease-in-out ${
                isOpen ? 'block' : 'hidden'
              }`}
            >
              <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80">
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

