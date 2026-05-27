import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopNavMobile from "./TopNavMobile";
import GlobalCreateModal from "@/components/shared/GlobalCreateModal";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar — fixed, handled internally */}
        <div className="hidden md:block shrink-0">
          <Sidebar onOpenCreate={() => setCreateModalOpen(true)} />
        </div>

        {/* Mobile Top Navigation */}
        <TopNavMobile />

        {/* Main Content Area — left padding matches collapsed sidebar width (72px) */}
        <main className="flex-1 w-full md:pl-[72px] pt-[52px] md:pt-0 pb-[72px] md:pb-0 transition-all duration-300">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onOpenCreate={() => setCreateModalOpen(true)} />
      </div>

      <GlobalCreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
};

export default AppLayout;
