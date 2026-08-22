import { Metadata } from 'next';
import PrivyAuthView from './privy-auth-view';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

export default function SignUpViewPage() {
  return <PrivyAuthView />;
}
