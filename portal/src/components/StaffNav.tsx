"use client";

import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/staff", label: "Обзор" },
  { href: "/staff/enrollments", label: "Enrollment" },
  { href: "/staff/meetings", label: "Встречи / BBB" },
  { href: "/staff/attendance", label: "Посещаемость" },
];

export function StaffNav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={path === item.href ? "active" : undefined}
        >
          {item.label}
        </a>
      ))}
      <a href="/learner">ЛК ученика (preview)</a>
    </nav>
  );
}
