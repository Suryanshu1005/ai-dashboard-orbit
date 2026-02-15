import * as React from "react"
import { cn } from "@/lib/utils"
// @ts-ignore - lucide-react will be installed
import { X } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
  return (
    <>
      {/* Overlay - only on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "h-full w-64 bg-white border-r border-gray-200 flex-shrink-0",
          "fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {children}
        </div>
      </div>
    </>
  )
}

interface SidebarHeaderProps {
  children: React.ReactNode
  onClose?: () => void
}

export function SidebarHeader({ children, onClose }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-gray-100 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

interface SidebarContentProps {
  children: React.ReactNode
}

export function SidebarContent({ children }: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {children}
    </div>
  )
}

