"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Matches", href: "/dashboard" }, // In this V1, Dashboard acts as matches page as well
    { label: "Signals", href: "/signals" },
  ];

  return (
    <nav className="bg-panel border-b border-grid sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-white font-bold text-xl tracking-wider">
                MOSPORT
              </Link>
            </div>
            
            {/* Desktop UI */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-secondary-text hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-secondary-text hover:text-white hover:bg-grid min-h-[44px] min-w-[44px]"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden border-t border-grid bg-panel">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-secondary-text hover:text-white hover:bg-grid hover:border-signal-blue"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
