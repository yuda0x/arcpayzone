'use client';

import { Icons } from '@/components/icons';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function OrgSwitcher() {
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' disabled className='cursor-default opacity-80'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
            <Icons.galleryVerticalEnd className='size-4' />
          </div>
          <div
            className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
              state === 'collapsed'
                ? 'invisible max-w-0 overflow-hidden opacity-0'
                : 'visible max-w-full opacity-100'
            }`}
          >
            <span className='truncate font-medium'>Arc Wallet</span>
            <span className='text-muted-foreground truncate text-xs'>Connected wallet</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
