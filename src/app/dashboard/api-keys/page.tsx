'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ENVIRONMENTS = ['Test', 'Live'] as const;
type Environment = (typeof ENVIRONMENTS)[number];
type KeyType = 'Publishable' | 'Secret';
type KeyStatus = 'Active' | 'Restricted' | 'Revoked';

interface ApiKey {
  id: string;
  name: string;
  type: KeyType;
  environment: Environment;
  value: string;
  preview: string;
  status: KeyStatus;
  created: string;
  lastUsed: string;
  requests: number;
  scopes: string[];
}

const initialKeys: ApiKey[] = [
  { id: 'key_1', name: 'Production server', type: 'Secret', environment: 'Live', value: 'sk_live_arc_pay_mock_7F42A91C', preview: 'sk_live_••••••••••••42A1', status: 'Active', created: 'Aug 02, 2026', lastUsed: '2 min ago', requests: 18420, scopes: ['Payments', 'Customers', 'Refunds'] },
  { id: 'key_2', name: 'Web checkout', type: 'Publishable', environment: 'Live', value: 'pk_live_arc_pay_mock_9D8E31B0', preview: 'pk_live_••••••••••••31B0', status: 'Active', created: 'Jul 18, 2026', lastUsed: '18 min ago', requests: 9420, scopes: ['Payments'] },
  { id: 'key_3', name: 'QA sandbox', type: 'Secret', environment: 'Test', value: 'sk_test_arc_pay_mock_4C19E8A2', preview: 'sk_test_••••••••••••E8A2', status: 'Restricted', created: 'Jun 24, 2026', lastUsed: 'Yesterday', requests: 2180, scopes: ['Payments'] },
  { id: 'key_4', name: 'Mobile app client', type: 'Publishable', environment: 'Test', value: 'pk_test_arc_pay_mock_8A22C4F1', preview: 'pk_test_••••••••••••C4F1', status: 'Active', created: 'May 11, 2026', lastUsed: '3 days ago', requests: 5620, scopes: ['Payments', 'Customers'] },
  { id: 'key_5', name: 'Legacy integration', type: 'Secret', environment: 'Live', value: 'sk_live_arc_pay_mock_1B77D0C4', preview: 'sk_live_••••••••••••D0C4', status: 'Revoked', created: 'Mar 09, 2026', lastUsed: 'Apr 02, 2026', requests: 784, scopes: ['Payments'] }
];

const SCOPES = ['Payments', 'Customers', 'Refunds', 'Payouts'] as const;
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function statusClassName(status: KeyStatus): string {
  switch (status) {
    case 'Active': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'Restricted': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Revoked': return 'border-red-500/30 bg-red-500/10 text-red-400';
  }
}

async function copyValue(value: string, label: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Copy failed');
  }
}

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<ApiKey[]>(initialKeys);
  const [search, setSearch] = React.useState('');
  const [environment, setEnvironment] = React.useState<Environment | 'All'>('All');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiKey | null>(null);
  const [revealedIds, setRevealedIds] = React.useState<Set<string>>(() => new Set());
  const [name, setName] = React.useState('');
  const [createEnvironment, setCreateEnvironment] = React.useState<Environment>('Test');
  const [scopes, setScopes] = React.useState<string[]>(['Payments']);

  const filteredKeys = keys.filter((key) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [key.name, key.preview, key.type].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (environment === 'All' || key.environment === environment);
  });
  const activeCount = keys.filter((key) => key.status === 'Active').length;
  const restrictedCount = keys.filter((key) => key.status === 'Restricted').length;
  const totalRequests = keys.reduce((sum, key) => sum + key.requests, 0);

  function toggleReveal(id: string): void {
    setRevealedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function toggleScope(scope: string): void {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  function createKey(): void {
    const safeName = name.trim() || 'New integration';
    const prefix = createEnvironment === 'Live' ? 'sk_live_' : 'sk_test_';
    const generated = `${prefix}arc_pay_mock_${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    const newKey: ApiKey = { id: `key_${Date.now()}`, name: safeName, type: 'Secret', environment: createEnvironment, value: generated, preview: `${prefix}••••••••••••${generated.slice(-4)}`, status: 'Active', created: 'Aug 19, 2026', lastUsed: 'Never', requests: 0, scopes: scopes.length ? scopes : ['Payments'] };
    setKeys((current) => [newKey, ...current]);
    setGeneratedKey(generated);
    setCreateOpen(false);
    setName('');
    setScopes(['Payments']);
  }

  function revokeKey(key: ApiKey): void { setKeys((current) => current.map((item) => item.id === key.id ? { ...item, status: 'Revoked' } : item)); toast.success(`${key.name} revoked`); }
  function deleteKey(): void { if (!deleteTarget) return; setKeys((current) => current.filter((key) => key.id !== deleteTarget.id)); toast.success(`${deleteTarget.name} deleted`); setDeleteTarget(null); }

  return (
    <PageContainer pageTitle='API Keys' pageDescription='API keys authenticate requests to the ARC Pay API.' pageHeaderAction={<Button onClick={() => setCreateOpen(true)}><Icons.add data-icon='inline-start' />Create API Key</Button>}>
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'><Card><CardHeader className='pb-2'><CardDescription>Active keys</CardDescription><CardTitle className='text-2xl tabular-nums'>{activeCount}</CardTitle></CardHeader><CardContent><p className='text-emerald-400 text-xs'>Ready for API requests</p></CardContent></Card><Card><CardHeader className='pb-2'><CardDescription>Restricted keys</CardDescription><CardTitle className='text-2xl tabular-nums'>{restrictedCount}</CardTitle></CardHeader><CardContent><p className='text-amber-400 text-xs'>Limited by permissions</p></CardContent></Card><Card><CardHeader className='pb-2'><CardDescription>Last used</CardDescription><CardTitle className='text-2xl'>2 min ago</CardTitle></CardHeader><CardContent><p className='text-muted-foreground text-xs'>Production server</p></CardContent></Card><Card><CardHeader className='pb-2'><CardDescription>API requests</CardDescription><CardTitle className='text-2xl tabular-nums'>{currency.format(totalRequests).replace('$', '')}</CardTitle></CardHeader><CardContent><p className='text-muted-foreground text-xs'>Across all environments</p></CardContent></Card></div>

        <Card><CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>Your API keys</CardTitle><CardDescription className='mt-1'>Keep secret keys private and rotate them regularly.</CardDescription></div><span className='text-muted-foreground text-sm'>{filteredKeys.length} key{filteredKeys.length === 1 ? '' : 's'}</span></CardHeader><CardContent className='flex flex-col gap-4 pt-6'><div className='flex flex-col gap-3 sm:flex-row'><div className='relative min-w-0 flex-1'><Icons.search className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search key name, type, or preview...' className='pl-9' aria-label='Search API keys' /></div><Select value={environment} onValueChange={(value) => setEnvironment(value as Environment | 'All')}><SelectTrigger className='w-full sm:w-40' aria-label='Filter API keys by environment'><SelectValue placeholder='Environment' /></SelectTrigger><SelectContent><SelectGroup><SelectItem value='All'>All environments</SelectItem>{ENVIRONMENTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>

          <div className='overflow-x-auto rounded-lg border'><Table className='min-w-[980px]'><TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Key name</TableHead><TableHead>Type</TableHead><TableHead>Environment</TableHead><TableHead>Key preview</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Last used</TableHead><TableHead className='w-12'>Actions</TableHead></TableRow></TableHeader><TableBody>{filteredKeys.length ? filteredKeys.map((key) => { const revealed = revealedIds.has(key.id); return <TableRow key={key.id}><TableCell><div className='font-medium'>{key.name}</div><div className='text-muted-foreground mt-1 text-xs'>{key.scopes.join(' · ')}</div></TableCell><TableCell>{key.type}</TableCell><TableCell><Badge variant='outline'>{key.environment}</Badge></TableCell><TableCell><span className='font-mono text-xs'>{revealed ? key.value : key.preview}</span></TableCell><TableCell><Badge variant='outline' className={statusClassName(key.status)}>{key.status}</Badge></TableCell><TableCell className='text-muted-foreground text-sm'>{key.created}</TableCell><TableCell className='text-muted-foreground text-sm'>{key.lastUsed}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger render={<Button type='button' variant='ghost' size='icon' aria-label={`Actions for ${key.name}`} />}><Icons.ellipsis /></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={() => void copyValue(key.value, 'API key')}><Icons.fileTypeDoc />Copy key</DropdownMenuItem><DropdownMenuItem onClick={() => toggleReveal(key.id)}>{revealed ? <Icons.eyeOff /> : <Icons.eyeOff />}{revealed ? 'Mask key' : 'Reveal key'}</DropdownMenuItem><DropdownMenuItem onClick={() => toast.info('Key editing is available in the API key settings queue.')}><Icons.edit />Edit key</DropdownMenuItem><DropdownMenuItem disabled={key.status === 'Revoked'} onClick={() => revokeKey(key)}><Icons.lock />Disable / revoke</DropdownMenuItem><DropdownMenuItem onClick={() => setDeleteTarget(key)}><Icons.trash />Delete key</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>; }) : <TableRow><TableCell colSpan={8} className='h-28 text-center'>No API keys found.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className='sm:max-w-md'><DialogHeader><DialogTitle>Create API Key</DialogTitle><DialogDescription>Generate a mock ARC Pay credential for this environment. No real secret is created.</DialogDescription></DialogHeader><div className='grid gap-4'><div className='grid gap-2'><label htmlFor='key-name' className='text-sm font-medium'>Key name</label><Input id='key-name' value={name} onChange={(event) => setName(event.target.value)} placeholder='e.g. Billing service' /></div><div className='grid gap-2'><label className='text-sm font-medium' htmlFor='key-environment'>Environment</label><Select value={createEnvironment} onValueChange={(value) => setCreateEnvironment(value as Environment)}><SelectTrigger id='key-environment'><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{ENVIRONMENTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div><div className='grid gap-2'><p className='text-sm font-medium'>Permissions</p>{SCOPES.map((scope) => <label key={scope} className='flex items-center gap-2 text-sm'><Checkbox checked={scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} /><span>{scope}</span></label>)}</div></div><DialogFooter><Button variant='outline' onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createKey}><Icons.add data-icon='inline-start' />Create key</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={generatedKey !== null} onOpenChange={(open) => !open && setGeneratedKey(null)}><DialogContent className='sm:max-w-lg'><DialogHeader><DialogTitle>API key created</DialogTitle><DialogDescription>Copy this secret now. For security, it will not be shown again after closing.</DialogDescription></DialogHeader><div className='rounded-lg border bg-muted/30 p-3 font-mono text-xs break-all'>{generatedKey}</div><DialogFooter><Button variant='outline' onClick={() => setGeneratedKey(null)}>Done</Button><Button onClick={() => generatedKey && void copyValue(generatedKey, 'API key')}><Icons.fileTypeDoc data-icon='inline-start' />Copy key</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete API key?</AlertDialogTitle><AlertDialogDescription>This permanently removes {deleteTarget?.name} from this local mock workspace.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep key</AlertDialogCancel><AlertDialogAction onClick={deleteKey}>Delete key</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </PageContainer>
  );
}
