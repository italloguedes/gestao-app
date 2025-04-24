"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-white w-64 min-h-screen p-4 border-r">
      <Logo />
      <nav className="mt-8">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-600 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                  }`}
                >
                  <svg
                    className={`h-6 w-6 shrink-0 transition-colors duration-200 ${
                      isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-600"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
} 