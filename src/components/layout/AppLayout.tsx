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
  const isReels = location.pathname.startsWith("/reels");
  const isProfile = location.pathname.startsWith("/profile");

  const isHideTopNav = isChatRoom || isReels || isProfile;
  const isHideBottomNav = isChatRoom;

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar — fixed, handled internally */}
        <div className="hidden md:block shrink-0">
          <Sidebar onOpenCreate={() => setCreateModalOpen(true)} />
        </div>

        {/* Mobile Top Navigation */}
        {!isHideTopNav && <TopNavMobile />}

        {/* Main Content Area */}
        <main className={`flex-1 w-full md:pl-[72px] transition-all duration-300 ${isHideTopNav || isReels ? "pt-0" : "pt-[48px] md:pt-0"} ${isHideBottomNav || isReels ? "pb-0" : "pb-[72px] md:pb-0"}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {!isHideBottomNav && <BottomNav onOpenCreate={() => setCreateModalOpen(true)} />}
      </div>

      <GlobalCreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
};

export default AppLayout;
