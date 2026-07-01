import { type ReactNode } from 'react';

interface BlankLayoutProps {
  children: ReactNode;
}

const BlankLayout = ({ children }: BlankLayoutProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      {children}
    </div>
  );
};

export default BlankLayout;
