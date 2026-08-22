import { InfoButton } from '@/components/ui/info-button';
import type { InfobarContent } from '@/components/ui/infobar';

interface HeadingProps {
  title: string;
  description: string;
  infoContent?: InfobarContent;
}

export function Heading({ title, description, infoContent }: HeadingProps) {
  return (
    <div>
      <div className='flex items-center gap-2'>
        <h1 className='text-balance text-3xl font-bold leading-tight tracking-tight'>{title}</h1>
        {infoContent && (
          <div className='pt-1'>
            <InfoButton content={infoContent} />
          </div>
        )}
      </div>
      <p className='text-muted-foreground mt-1 max-w-2xl text-sm leading-6'>{description}</p>
    </div>
  );
}
