import type { InfobarContent } from '@/components/ui/infobar';

export const workspacesInfoContent: InfobarContent = {
  title: 'Workspaces Management',
  sections: [
    {
      title: 'Overview',
      description:
        'The workspace view is designed for wallet-backed and deployment-specific project contexts. Use it to organize related ArcPay activity without relying on an external organization provider.',
      links: []
    },
    {
      title: 'Configuring Workspaces',
      description:
        'Each workspace can map to a deployment context, treasury group, or payment domain. Configure these views in the app layer according to your operating model.',
      links: []
    },
    {
      title: 'Switching Views',
      description:
        'Switch between workspace contexts directly in the application shell as your product workflow changes. This avoids coupling UI behavior to a third-party identity product.',
      links: []
    }
  ]
};

export const teamInfoContent: InfobarContent = {
  title: 'Team Management',
  sections: [
    {
      title: 'Overview',
      description:
        'Team access details in ArcPay are handled by your application’s role and permissions model rather than a Clerk organization abstraction.',
      links: []
    },
    {
      title: 'Managing Team Members',
      description:
        'Use your app’s role model to assign permissions for operations, treasury, compliance, and support workflows.',
      links: []
    },
    {
      title: 'Security Settings',
      description:
        'Protect sensitive actions with application-level access checks and wallet-level authorization for blockchain operations.',
      links: []
    }
  ]
};

export const billingInfoContent: InfobarContent = {
  title: 'Billing & Plans',
  sections: [
    {
      title: 'Overview',
      description:
        'ArcPay billing and plan enforcement can be modeled through your own service layer without relying on Clerk billing.',
      links: []
    },
    {
      title: 'Available Plans',
      description:
        'Use the standard plan cards on this page as the current product-tier model during billing integration.',
      links: []
    },
    {
      title: 'Access Control',
      description:
        'Premium features can be gated in application code, backend checks, or wallet- and permission-based logic depending on your deployment needs.',
      links: []
    }
  ]
};

export const productInfoContent: InfobarContent = {
  title: 'Product Management',
  sections: [
    {
      title: 'Overview',
      description:
        'The Products page allows you to manage your product catalog. You can view all products in a table format with server-side functionality including sorting, filtering, pagination, and search capabilities. Use the "Add New" button to create new products.',
      links: [
        {
          title: 'Product Management Guide',
          url: '#'
        }
      ]
    },
    {
      title: 'Adding Products',
      description:
        'To add a new product, click the "Add New" button in the page header. You will be taken to a form where you can enter product details including name, description, price, category, and upload product images.',
      links: [
        {
          title: 'Adding Products Documentation',
          url: '#'
        }
      ]
    },
    {
      title: 'Editing Products',
      description:
        'You can edit existing products by clicking on a product row in the table. This will open the product edit form where you can modify any product information. Changes are saved automatically when you submit the form.',
      links: [
        {
          title: 'Editing Products Guide',
          url: '#'
        }
      ]
    },
    {
      title: 'Deleting Products',
      description:
        'Products can be deleted from the product listing table. Click the delete action for the product you want to remove. You will be asked to confirm the deletion before the product is permanently removed from your catalog.',
      links: [
        {
          title: 'Product Deletion Policy',
          url: '#'
        }
      ]
    },
    {
      title: 'Table Features',
      description:
        'The product table includes several powerful features to help you manage large product catalogs efficiently. You can sort columns by clicking on column headers, filter products using the filter controls, navigate through pages using pagination, and quickly find products using the search functionality.',
      links: [
        {
          title: 'Table Features Documentation',
          url: '#'
        },
        {
          title: 'Sorting and Filtering Guide',
          url: '#'
        }
      ]
    },
    {
      title: 'Product Fields',
      description:
        'Each product can have the following fields: Name (required), Description (optional text), Price (numeric value), Category (for organizing products), and Image Upload (for product photos). All fields can be edited when creating or updating a product.',
      links: [
        {
          title: 'Product Fields Specification',
          url: '#'
        }
      ]
    }
  ]
};
