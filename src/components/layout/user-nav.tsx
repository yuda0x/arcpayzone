'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const { authenticated, disconnect } = useCanonicalWallet();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' className='relative h-8 w-8 rounded-full' />}
      >
        <div className='bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold'>
          {authenticated ? 'AW' : 'N'}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>Arc Wallet</p>
              <p className='text-muted-foreground text-xs leading-none'>
                {authenticated ? 'Wallet connected' : 'Wallet disconnected'}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/billing')}>Billing</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>Notifications</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={async () => {
              await disconnect();
              router.push('/auth/sign-in');
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
