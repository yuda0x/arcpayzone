import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { NotificationCenter } from '@/features/notifications/components/notification-center';
import { ArcWallet } from '@/components/wallet/arc-wallet';

export default function Header() {
  return (
    <header className='bg-background sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/70 px-4 md:h-[60px] md:px-6'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-1 h-5 data-vertical:self-center' />
        <Breadcrumbs />
      </div>

      <div className='ml-auto flex shrink-0 items-center justify-end gap-3'>
        <ArcWallet />
        <div className='hidden md:flex'>
          <SearchInput />
        </div>
        <ThemeModeToggle />
        <NotificationCenter />
      </div>
    </header>
  );
}
