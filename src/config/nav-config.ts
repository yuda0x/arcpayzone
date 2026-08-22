import { NavGroup } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 * Items are organized into groups, each rendered with a SidebarGroupLabel.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'MAIN',
    items: [
      { title: 'Overview', url: '/dashboard/overview', icon: 'dashboard', isActive: false, items: [] },
      { title: 'Transactions', url: '/dashboard/transactions', icon: 'page', isActive: false, items: [] },
      { title: 'Payments', url: '/dashboard/payments', icon: 'creditCard', isActive: false, items: [] },
      { title: 'Invoices', url: '/dashboard/invoices', icon: 'post', isActive: false, items: [] },
      { title: 'Payouts', url: '/dashboard/payouts', icon: 'billing', isActive: false, items: [] },
      { title: 'Refunds', url: '/dashboard/refunds', icon: 'share', isActive: false, items: [] }
    ]
  },
  {
    label: 'ANALYTICS',
    items: [
      { title: 'Reports', url: '/dashboard/reports', icon: 'post', isActive: false, items: [] },
      { title: 'Payment Analytics', url: '/dashboard/payment-analytics', icon: 'trendingUp', isActive: false, items: [] }
    ]
  },
  {
    label: 'ARC PAYZONE',
    items: [
      { title: 'Portfolio & DeFi', url: '/dashboard/payzone?tab=portfolio', icon: 'trendingUp', isActive: false, items: [] },
      { title: 'Send', url: '/dashboard/payzone?tab=send', icon: 'send', isActive: false, items: [] },
      { title: 'Request', url: '/dashboard/payzone?tab=request', icon: 'share', isActive: false, items: [] },
      { title: 'Receive', url: '/dashboard/payzone?tab=receive', icon: 'creditCard', isActive: false, items: [] },
      { title: 'Faucet', url: '/dashboard/payzone?tab=faucet', icon: 'upload', isActive: false, items: [] },
      { title: 'Arc PayZone Swap', url: '/dashboard/payzone?tab=swap', icon: 'sparkles', isActive: false, items: [] },
      { title: 'Liquidity', url: '/dashboard/payzone?tab=lp', icon: 'adjustments', isActive: false, items: [] },
      { title: 'Daily GM', url: '/dashboard/payzone?tab=dailygm', icon: 'sparkles', isActive: false, items: [] },
      { title: 'Arc PayZone Domains', url: '/dashboard/payzone?tab=domains', icon: 'user', isActive: false, items: [] },
      { title: 'History', url: '/dashboard/payzone?tab=history', icon: 'clock', isActive: false, items: [] },
      { title: 'About', url: '/dashboard/payzone?tab=learn', icon: 'info', isActive: false, items: [] }
    ]
  }
];
