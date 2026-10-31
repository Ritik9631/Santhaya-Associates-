'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  FileSpreadsheet,
  Receipt,
  Mail,
  Menu,
  X,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import type { StaffRole } from '@/types/database';

interface StaffSidebarProps {
  userRole: StaffRole;
  userName: string;
}

export function StaffSidebar({ userRole }: StaffSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const canManageTeam = userRole === 'super_admin' || userRole === 'admin';

  interface NavItem {
    name: string;
    href: string;
    icon: any;
    active: boolean;
    available: boolean;
    badge?: string;
    stage?: string;
  }

  const navItems: NavItem[] = [
    {
      name: 'Overview',
      href: '/staff',
      icon: LayoutDashboard,
      active: pathname === '/staff',
      available: true,
    },
    {
      name: 'Staff Team',
      href: '/staff/team',
      icon: Users,
      active: pathname.startsWith('/staff/team'),
      available: true,
      badge: canManageTeam ? undefined : 'Directory',
    },
    {
      name: 'Customers',
      href: '/staff/customers',
      icon: Building2,
      active: pathname.startsWith('/staff/customers'),
      available: true,
    },
    {
      name: 'Machinery & Catalog',
      href: '/staff/catalog',
      icon: Package,
      active: pathname.startsWith('/staff/catalog'),
      available: true,
    },
    {
      name: 'Quotations',
      href: '/staff/quotations',
      icon: FileSpreadsheet,
      active: pathname.startsWith('/staff/quotations'),
      available: true,
    },
    {
      name: 'GST Invoices',
      href: '/staff/billing',
      icon: Receipt,
      active: pathname.startsWith('/staff/billing'),
      available: true,
    },
    {
      name: 'Communications',
      href: '/staff/communications',
      icon: Mail,
      active: pathname.startsWith('/staff/communications'),
      available: true,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Navigation</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed lg:static top-16 left-0 bottom-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Staff Management</p>
          <p className="text-xs text-slate-300 font-medium mt-0.5">Santhaya Associates ERP</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.available) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={item.active ? 'page' : undefined}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    item.active
                      ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${item.active ? 'text-gold-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 cursor-not-allowed select-none"
                title={`Planned for ${item.stage || 'future release'}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-800">
                  {item.stage || item.badge}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Quick Action for Admins */}
        {canManageTeam && (
          <div className="p-3 border-t border-slate-800">
            <Link
              href="/staff/team/invite"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Staff</span>
            </Link>
          </div>
        )}

        {/* System Scope Lock Notice */}
        <div className="p-3 border-t border-slate-800/60 bg-slate-950/40 text-[10px] text-slate-400 flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-gold-400 flex-shrink-0 mt-0.5" />
          <span>Construction tenders & machinery supply scope locked. Private ERP.</span>
        </div>
      </aside>
    </>
  );
}

