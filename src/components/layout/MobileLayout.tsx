import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import BottomNav from '@/components/dashboard/BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  headerAction?: React.ReactNode;
  className?: string;
  hideBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  headerAction,
  className,
  hideBottomNav = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mobile-container">
      {/* Header */}
      {title && (
        <header className="mobile-header">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </header>
      )}

      {/* Scrollable Content */}
      <main className={cn("mobile-content", className)}>
        <div className="p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;