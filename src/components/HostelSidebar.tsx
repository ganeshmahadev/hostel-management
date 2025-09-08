"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Building, Calendar, History, MapPin } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DatePicker } from '@/components/DatePicker';
import { Badge } from '@/components/ui/badge';
import { UserButton, useUser } from '@clerk/nextjs';

interface HostelSidebarProps {
  children: React.ReactNode;
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  activeView?: string;
  onViewChange?: (view: 'dashboard' | 'rooms' | 'mybookings') => void;
}

export function HostelSidebar({ 
  children, 
  selectedDate, 
  onDateChange, 
  activeView = 'dashboard',
  onViewChange 
}: HostelSidebarProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <Building className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => onViewChange?.('dashboard'),
      active: activeView === 'dashboard'
    },
    {
      label: "Availability Grid",
      href: "#",
      icon: (
        <Calendar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => onViewChange?.('rooms'),
      active: activeView === 'rooms'
    },
    {
      label: "My Bookings",
      href: "#",
      icon: (
        <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => onViewChange?.('mybookings'),
      active: activeView === 'mybookings'
    },
  ];

  return (
    <div className="flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 border border-neutral-200 dark:border-neutral-700 overflow-hidden h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            
            {/* Date Picker - only show when sidebar is open */}
            <motion.div
              animate={{
                display: open ? "block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="mt-4"
            >
              <div className="mb-4">
                <DatePicker
                  date={selectedDate}
                  onDateChange={onDateChange}
                  placeholder="Select date"
                />
              </div>
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  H1-H7
                </Badge>
              </div>
            </motion.div>
            
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  onClick={link.onClick}
                  className={cn(
                    "cursor-pointer rounded-md",
                    link.active && "bg-neutral-200 dark:bg-neutral-700"
                  )}
                >
                  <SidebarLink 
                    link={{
                      label: link.label,
                      href: link.href,
                      icon: link.icon
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* User Profile */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <motion.div
              animate={{
                display: open ? "block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="mb-4"
            >
              {user && (
                <div className="text-sm">
                  <div className="font-medium text-neutral-800 dark:text-neutral-200">
                    {user.fullName || user.firstName}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {user.primaryEmailAddress?.emailAddress}
                  </div>
                </div>
              )}
            </motion.div>
            
            <div className="flex items-center gap-2 -mt-2">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-sm text-neutral-700 dark:text-neutral-200"
              >
                Profile
              </motion.span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main Content */}
      <div className="flex flex-1">
        <div className="flex-1 w-full h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <Building className="h-6 w-6 text-primary flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Hostel Management
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <Building className="h-6 w-6 text-primary flex-shrink-0" />
    </Link>
  );
};