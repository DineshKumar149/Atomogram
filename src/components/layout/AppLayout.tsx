import { ReactNode, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopNavMobile from "./TopNavMobile";
import GlobalCreateModal from "@/components/shared/GlobalCreateModal";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isChatRoom = location.pathname.startsWith("/chat") && searchParams.has("c");

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar — fixed, handled internally */}
        <div className="hidden md:block shrink-0">
          <Sidebar onOpenCreate={() => setCreateModalOpen(true)} />
        </div>

        {/* Mobile Top Navigation */}
        {!isChatRoom && <TopNavMobile />}

        {/* Main Content Area — left padding matches collapsed sidebar width (72px) */}
        <main className={`flex-1 w-full md:pl-[72px] transition-all duration-300 ${isChatRoom ? "" : "pt-[52px] md:pt-0 pb-[72px] md:pb-0"}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {!isChatRoom && <BottomNav onOpenCreate={() => setCreateModalOpen(true)} />}
      </div>

      <GlobalCreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
};

export default AppLayout;
