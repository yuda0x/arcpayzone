'use client';

import { Icons } from '@/components/icons';
import { usePathname } from 'next/navigation';

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/yuda0x', icon: Icons.github },
  { label: 'X', href: 'https://x.com/0xqorii', icon: Icons.twitter },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/bdshakil/', icon: Icons.linkedin },
  { label: 'Telegram', href: 'https://t.me/shakilhossain69', icon: Icons.telegram }
];

export default function DashboardFooter() {
  const pathname = usePathname();

  if (pathname === '/dashboard/payzone') return null;

  return (
    <footer className='mt-auto border-t border-border/80 bg-background py-3.5 backdrop-blur-xl'>
      <div className='mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:px-6 md:flex-row'>
        <div className='text-muted-foreground text-center text-[10px] font-bold uppercase tracking-[0.22em] md:text-left'>
          © 2026 ARC PAYZONE • BUILT ON ARC NETWORK
        </div>

        <div className='flex flex-col items-center gap-1.5 md:items-end'>
          <div className='text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.22em]'>
            BUILT BY SHAKIL AHMED
          </div>
          <div className='flex flex-wrap items-center justify-center gap-2 md:justify-end'>
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                aria-label={label}
                title={label}
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground border-border bg-muted hover:text-foreground hover:bg-accent inline-flex size-8 items-center justify-center rounded-full border transition-colors duration-200'
              >
                <Icon className='size-3.5' />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
