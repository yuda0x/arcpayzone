'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icons } from '../icons';

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const isNavItemActive = (url: string) => {
    const itemUrl = new URL(url, 'http://localhost');
    if (pathname !== itemUrl.pathname && !pathname.startsWith(`${itemUrl.pathname}/`)) return false;

    for (const [key, value] of itemUrl.searchParams) {
      if (searchParams.get(key) !== value) return false;
    }

    return true;
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='gap-3 border-b border-sidebar-border/70 px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4'>
        <Link
          href='/dashboard/overview'
          aria-label='Arc Pay home'
          className='flex h-12 w-full items-center justify-center px-0 group-data-[collapsible=icon]:size-8'
        >
          <Image
            src='/assets/sHyVRItm_400x400.jpg'
            alt='Arc Pay home'
            width={240}
            height={48}
            className='h-full w-full rounded-lg object-contain'
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className='gap-1 overflow-x-hidden bg-sidebar px-2 py-2'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='gap-1 px-1 py-2'>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return item?.items && item?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={item.isActive}
                    render={<SidebarMenuItem />}
                  >
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isNavItemActive(item.url)}
                          className='group/collapsible'
                        />
                      }
                    >
                      {item.icon && <Icon />}
                      <span>{item.title}</span>
                      <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90' />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              render={<Link href={subItem.url} aria-label={subItem.title} />}
                              isActive={isNavItemActive(subItem.url)}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={isNavItemActive(item.url)}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
