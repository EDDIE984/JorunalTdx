"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, LayoutDashboard, Settings as SettingsIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { cn } from "@/lib/utils";

type Seccion = "journal" | "dashboard" | "settings";

const NAV_ITEMS: { href: string; seccion: Seccion; label: string; Icon: typeof BookOpenText }[] = [
  { href: "/journal", seccion: "journal", label: "Journal", Icon: BookOpenText },
  { href: "/dashboard", seccion: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/settings", seccion: "settings", label: "Configuración", Icon: SettingsIcon },
];

interface AppShellProps {
  activo: Seccion;
  nombre: string;
  titulo: string;
  children: React.ReactNode;
}

export function AppShell({ activo, nombre, titulo, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{titulo}</h1>
            <p className="text-xs text-primary-foreground/80">{nombre}</p>
          </div>
          <div className="hidden items-center gap-5 sm:flex">
            {NAV_ITEMS.map(({ href, seccion, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm underline decoration-dotted underline-offset-4",
                  seccion === activo && "font-semibold no-underline"
                )}
              >
                {label}
              </Link>
            ))}
            <LogoutButton />
          </div>
          <div className="sm:hidden">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-20 sm:p-6 sm:pb-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-card sm:hidden">
        {NAV_ITEMS.map(({ href, seccion, label, Icon }) => {
          const isActive = seccion === activo || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
