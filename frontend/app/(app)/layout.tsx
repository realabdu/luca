import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import OnboardingRedirect from "@/components/OnboardingRedirect";
import { CommandPaletteProvider } from "@/components/CommandPalette";

// Prevent static generation - these pages require Clerk auth at runtime
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden bg-background-light">
          <Header />
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <OnboardingRedirect>
              {children}
            </OnboardingRedirect>
          </div>
        </main>
      </div>
    </CommandPaletteProvider>
  );
}
