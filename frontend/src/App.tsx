import { useEffect, useState, type ReactNode } from 'react'
import Sidebar, { type NavGroup } from './components/layout/Sidebar'
import Header, { type Breadcrumb } from './components/layout/Header'
import Dashboard from './pages/Dashboard'
import Staff from './pages/Staff'
import Departments from './pages/Departments'
import Attendance from './pages/Attendance'
import Payroll from './pages/Payroll'
import Projects from './pages/Projects'
import CRM from './pages/CRM'
import Documents from './pages/Documents'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Administration from './pages/Administration'
import ModulePlaceholder from './pages/ModulePlaceholder'
import Login from './components/auth/Login'
import { AuthProvider, useAuth } from './lib/auth'

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function Icon({ d, children }: { d?: string; children?: ReactNode }) {
  if (children)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {children}
      </svg>
    )
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Nav definition ─────────────────────────────────────────────────────── */

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
          <Icon>
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </Icon>
        ),
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        icon: (
          <Icon>
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 14c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 7.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M14 14c0-1.381-.672-2.5-1.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
      {
        id: 'attendance',
        label: 'Attendance & Leave',
        icon: (
          <Icon>
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 6.5h12M5.5 2v2M10.5 2v2M5 9.5l1.5 1.5L9.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </Icon>
        ),
      },
      {
        id: 'payroll',
        label: 'Payroll',
        icon: (
          <Icon>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v1.5M8 9.5V11M6.5 6.5C6.5 5.672 7.172 5 8 5s1.5.672 1.5 1.5S9.328 8 8 8s-1.5.672-1.5 1.5S7.172 11 8 11s1.5-.672 1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        id: 'crm',
        label: 'CRM',
        icon: (
          <Icon>
            <path d="M8 2C5.239 2 3 4.239 3 7c0 1.657.806 3.13 2.047 4.054L4.5 14l3-1.5L10.5 14l-.547-2.946A4.976 4.976 0 0013 7c0-2.761-2.239-5-5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </Icon>
        ),
      },
      {
        id: 'projects',
        label: 'Projects & Tasks',
        icon: (
          <Icon>
            <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 5.5l1.5 1.5L9.5 4M5 9l1.5 1.5L9.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </Icon>
        ),
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: (
          <Icon>
            <path d="M2 4.5l6-3 6 3v7l-6 3-6-3v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M8 1.5v13M2 4.5l6 3 6-3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </Icon>
        ),
      },
      {
        id: 'sales',
        label: 'Sales & Purchases',
        icon: (
          <Icon>
            <path d="M2 3h12l-1.5 8H3.5L2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M2 3L1.5 1H0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6" cy="14" r="1" fill="currentColor" />
            <circle cx="11" cy="14" r="1" fill="currentColor" />
          </Icon>
        ),
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        id: 'finance',
        label: 'Finance',
        icon: (
          <Icon>
            <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 7h12M6 10h1.5M9 10h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      {
        id: 'documents',
        label: 'Documents',
        icon: (
          <Icon>
            <path d="M4 2h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M10 2v4h4M6 9h4M6 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: (
          <Icon>
            <path d="M2 13V6l4-4h6l2 2v9H2zM6 2v4H2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        icon: (
          <Icon>
            <path d="M8 1.5a4.5 4.5 0 014.5 4.5v3l1 1.5H2.5L3.5 9V6A4.5 4.5 0 018 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" />
          </Icon>
        ),
      },
      {
        id: 'administration',
        label: 'Administration',
        icon: (
          <Icon>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.636 3.636l1.06 1.06M11.304 11.304l1.06 1.06M3.636 12.364l1.06-1.06M11.304 4.696l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </Icon>
        ),
      },
    ],
  },
]

/* ─── Page registry ──────────────────────────────────────────────────────── */

// Parent group -> primary navigation page mapping
const PARENT_NAV_ID: Record<string, string> = {
  People: 'employees',
  Operations: 'projects',
  Finance: 'finance',
  Knowledge: 'documents',
  System: 'administration',
}

const PAGE_META: Record<string, { title: string; parent?: string }> = {
  dashboard: { title: 'Dashboard' },
  employees: { title: 'Employees', parent: 'People' },
  departments: { title: 'Departments', parent: 'People' },
  attendance: { title: 'Attendance & Leave', parent: 'People' },
  payroll: { title: 'Payroll', parent: 'People' },
  crm: { title: 'CRM', parent: 'Operations' },
  projects: { title: 'Projects & Tasks', parent: 'Operations' },
  inventory: { title: 'Inventory', parent: 'Operations' },
  sales: { title: 'Sales & Purchases', parent: 'Operations' },
  finance: { title: 'Finance', parent: 'Finance' },
  documents: { title: 'Documents', parent: 'Knowledge' },
  reports: { title: 'Reports', parent: 'Knowledge' },
  notifications: { title: 'Notifications', parent: 'System' },
  administration: { title: 'Administration', parent: 'System' },
  profile: { title: 'My Profile' },
  settings: { title: 'Account Settings' },
}

/* ─── Module placeholder configs ─────────────────────────────────────────── */

type ModuleColor = 'red' | 'blue' | 'purple' | 'orange' | 'green'

const MODULE_CONFIGS: Record<
  string,
  {
    icon: ReactNode
    description: string
    color: ModuleColor
    stats: Array<{ label: string; value: string; trend?: string; trendType?: 'up' | 'down' | 'neutral'; color: ModuleColor }>
    features: string[]
  }
> = {
  employees: {
    description: 'Manage staff records, roles, departments, and onboarding.',
    color: 'red',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 20c0-3.866 2.686-7 6-7s6 3.134 6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 10.5c1.657 0 3 1.343 3 3s-1.343 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M19.5 20c0-2.485-1.343-4.5-3-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stats: [
      { label: 'Total employees', value: '250', trend: '+12 this quarter', trendType: 'up', color: 'red' },
      { label: 'Active this month', value: '238', trend: 'Stable', trendType: 'neutral', color: 'blue' },
      { label: 'Departments', value: '8', trendType: 'neutral', color: 'purple' },
      { label: 'New onboarding', value: '5', trend: 'This month', trendType: 'up', color: 'green' },
    ],
    features: [
      'Employee Directory',
      'Department Management',
      'Onboarding Workflows',
      'Role & Permission',
      'Job Profiles',
      'Performance Reviews',
      'Employee Self-Service',
      'Org Chart',
      'Exit Management',
    ],
  },
  attendance: {
    description: 'Track daily attendance, manage shifts, and approve leave requests.',
    color: 'blue',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h16M7.5 3v3M14.5 3v3M7 13l2 2 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    stats: [
      { label: 'Present today', value: '214', trend: '89.7% rate', trendType: 'up', color: 'green' },
      { label: 'On leave', value: '18', trendType: 'neutral', color: 'orange' },
      { label: 'Pending approvals', value: '7', trend: 'Needs action', trendType: 'down', color: 'red' },
      { label: 'Absent', value: '18', trendType: 'neutral', color: 'blue' },
    ],
    features: [
      'Daily Attendance Log',
      'Shift Management',
      'Leave Requests',
      'Leave Approvals',
      'Overtime Tracking',
      'Holiday Calendar',
      'Attendance Reports',
      'Biometric Integration',
      'Remote Check-in',
    ],
  },
  crm: {
    description: 'Manage leads, contacts, accounts, and sales pipeline.',
    color: 'purple',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2C7.134 2 4 5.134 4 9c0 2.387 1.154 4.508 2.933 5.835L6 20l5-2.5 5 2.5-.933-5.165A6.972 6.972 0 0018 9c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    stats: [
      { label: 'Active leads', value: '142', trend: '+18 this week', trendType: 'up', color: 'purple' },
      { label: 'Won this month', value: '24', trend: '+6 vs last month', trendType: 'up', color: 'green' },
      { label: 'Pipeline value', value: '$2.4M', trendType: 'up', color: 'blue' },
      { label: 'Avg. close time', value: '14d', trendType: 'neutral', color: 'orange' },
    ],
    features: [
      'Lead Management',
      'Contact Directory',
      'Account Profiles',
      'Sales Pipeline',
      'Activity Timeline',
      'Email Integration',
      'Deal Tracking',
      'Customer Segments',
      'CRM Reports',
    ],
  },
  projects: {
    description: 'Plan, track, and deliver projects and tasks across teams.',
    color: 'orange',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8l2 2 4.5-4.5M7 13l2 2 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    stats: [
      { label: 'Active projects', value: '38', trend: '+4 this month', trendType: 'up', color: 'orange' },
      { label: 'Tasks in progress', value: '127', trendType: 'neutral', color: 'blue' },
      { label: 'Overdue tasks', value: '9', trend: 'Need attention', trendType: 'down', color: 'red' },
      { label: 'Completed today', value: '15', trend: 'Good pace', trendType: 'up', color: 'green' },
    ],
    features: [
      'Project Dashboard',
      'Task Boards (Kanban)',
      'Gantt Charts',
      'Milestones',
      'Team Assignments',
      'Time Tracking',
      'File Attachments',
      'Project Reports',
      'Workload View',
    ],
  },
  inventory: {
    description: 'Track stock levels, manage warehouses, and handle procurement.',
    color: 'green',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 6l8-4 8 4v10l-8 4-8-4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M11 2v20M3 6l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    stats: [
      { label: 'Total SKUs', value: '1,842', trendType: 'neutral', color: 'green' },
      { label: 'Low stock alerts', value: '23', trend: 'Action needed', trendType: 'down', color: 'red' },
      { label: 'Pending orders', value: '47', trendType: 'neutral', color: 'orange' },
      { label: 'Warehouses', value: '3', trendType: 'neutral', color: 'blue' },
    ],
    features: [
      'Stock Management',
      'Warehouse Locations',
      'Reorder Alerts',
      'Batch / Lot Tracking',
      'Supplier Catalog',
      'Purchase Orders',
      'Stock Transfers',
      'Inventory Valuation',
      'Barcode / QR Support',
    ],
  },
  sales: {
    description: 'Manage sales orders, invoices, purchases, and vendor relations.',
    color: 'blue',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 4h16L17 14H5L3 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3 4l-1-2H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="18.5" r="1.5" fill="currentColor" />
        <circle cx="14" cy="18.5" r="1.5" fill="currentColor" />
      </svg>
    ),
    stats: [
      { label: 'Total sales MTD', value: '$842K', trend: '+21% vs last month', trendType: 'up', color: 'green' },
      { label: 'Open orders', value: '68', trendType: 'neutral', color: 'blue' },
      { label: 'Overdue invoices', value: '12', trend: 'Follow up required', trendType: 'down', color: 'red' },
      { label: 'Active vendors', value: '34', trendType: 'neutral', color: 'purple' },
    ],
    features: [
      'Sales Orders',
      'Quotations',
      'Customer Invoices',
      'Purchase Orders',
      'Vendor Management',
      'Payment Receipts',
      'Pricing Rules',
      'Sales Analytics',
      'Credit Management',
    ],
  },
  finance: {
    description: 'Manage accounts, budgets, transactions, and financial reporting.',
    color: 'purple',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h16M7 13h1.5M11 13h1.5M15 13h1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 5V4a1 1 0 011-1h6a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stats: [
      { label: 'Total revenue', value: '$11.8M', trend: '+21% YTD', trendType: 'up', color: 'green' },
      { label: 'Total expenses', value: '$7.2M', trendType: 'neutral', color: 'orange' },
      { label: 'Net profit', value: '$4.6M', trend: '39% margin', trendType: 'up', color: 'purple' },
      { label: 'Pending approvals', value: '14', trend: 'Action needed', trendType: 'down', color: 'red' },
    ],
    features: [
      'Chart of Accounts',
      'Journal Entries',
      'Budget Management',
      'Bank Reconciliation',
      'Tax Management',
      'Financial Reports',
      'Expense Claims',
      'Asset Management',
      'Audit Trail',
    ],
  },
  documents: {
    description: 'Store, organise, and share company documents and policies.',
    color: 'orange',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 3h8l5 5v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13 3v5h5M8 12h6M8 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stats: [
      { label: 'Total documents', value: '3,412', trendType: 'neutral', color: 'orange' },
      { label: 'Shared this month', value: '89', trend: '+12 vs last month', trendType: 'up', color: 'blue' },
      { label: 'Pending review', value: '16', trendType: 'neutral', color: 'red' },
      { label: 'Storage used', value: '14.2 GB', trendType: 'neutral', color: 'purple' },
    ],
    features: [
      'Document Library',
      'Folder Structure',
      'Version History',
      'Access Control',
      'Document Templates',
      'E-Signatures',
      'Full-text Search',
      'Document Sharing',
      'Audit Log',
    ],
  },
  reports: {
    description: 'Generate and schedule cross-module analytics and data reports.',
    color: 'green',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 17V7l4-4h8l2 2v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 3v4H4M7 12h8M7 15.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stats: [
      { label: 'Report templates', value: '47', trendType: 'neutral', color: 'green' },
      { label: 'Scheduled reports', value: '12', trendType: 'neutral', color: 'blue' },
      { label: 'Generated today', value: '8', trendType: 'neutral', color: 'purple' },
      { label: 'Data sources', value: '13', trendType: 'neutral', color: 'orange' },
    ],
    features: [
      'Report Builder',
      'Cross-module Data',
      'Scheduled Delivery',
      'Export to PDF/Excel',
      'KPI Dashboards',
      'Custom Metrics',
      'Data Visualizations',
      'Saved Report Templates',
      'Role-based Access',
    ],
  },
  notifications: {
    description: 'Manage system alerts, reminders, and communication preferences.',
    color: 'red',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2a6.5 6.5 0 016.5 6.5v4l1.5 2H3L4.5 12.5V8.5A6.5 6.5 0 0111 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 17.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    stats: [
      { label: 'Unread', value: '3', trend: 'Needs attention', trendType: 'down', color: 'red' },
      { label: 'Today', value: '11', trendType: 'neutral', color: 'orange' },
      { label: 'This week', value: '34', trendType: 'neutral', color: 'blue' },
      { label: 'Dismissed', value: '67', trendType: 'neutral', color: 'green' },
    ],
    features: [
      'In-app Notifications',
      'Email Alerts',
      'Notification Preferences',
      'System Announcements',
      'Reminder Setup',
      'Digest Settings',
      'Escalation Rules',
      'Push Notifications',
      'Notification History',
    ],
  },
  administration: {
    description: 'Configure system settings, roles, permissions, and integrations.',
    color: 'purple',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    stats: [
      { label: 'System users', value: '28', trendType: 'neutral', color: 'purple' },
      { label: 'Active roles', value: '7', trendType: 'neutral', color: 'blue' },
      { label: 'Integrations', value: '5', trendType: 'neutral', color: 'green' },
      { label: 'Audit events', value: '1,204', trend: 'Last 30 days', trendType: 'neutral', color: 'orange' },
    ],
    features: [
      'User Management',
      'Role & Permissions',
      'Company Settings',
      'Module Configuration',
      'Integration Hub',
      'Audit Logs',
      'Data Backup',
      'SSO / 2FA',
      'System Health',
    ],
  },
}

/* ─── Breadcrumb builder ─────────────────────────────────────────────────── */

function getBreadcrumbs(pageId: string): Breadcrumb[] {
  const meta = PAGE_META[pageId]
  if (!meta) return [{ label: 'Dashboard', id: 'dashboard' }]
  if (!meta.parent) return [{ label: meta.title }]
  const parentNavId = PARENT_NAV_ID[meta.parent]
  return [
    { label: 'Home', id: 'dashboard' },
    { label: meta.parent, id: parentNavId },
    { label: meta.title },
  ]
}

/* ─── App ─────────────────────────────────────────────────────────────────── */

function ERPApp() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('erp_dark_mode') === '1')

  const { user, loading } = useAuth()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('erp_dark_mode', isDark ? '1' : '0')
  }, [isDark])

  function navigate(id: string) {
    setActivePage(id)
    setMobileMenuOpen(false)
  }

  function toggleDark() {
    setIsDark((d) => !d)
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  // A password-reset email link (#access_token=...&type=recovery) always
  // routes to the reset screen, even if a stale session is still logged in
  // in this browser — otherwise the link would silently do nothing.
  const isRecoveryLink = window.location.hash.includes('type=recovery')
  if (!user || isRecoveryLink) return <Login />

  // Build page content
  let content: ReactNode
  if (activePage === 'dashboard') {
    content = <Dashboard onNavigate={navigate} />
  } else if (activePage === 'employees') {
    content = <Staff />
  } else if (activePage === 'departments') {
    content = <Departments />
  } else if (activePage === 'attendance') {
    content = <Attendance />
  } else if (activePage === 'payroll') {
    content = <Payroll />
  } else if (activePage === 'projects') {
    content = <Projects />
  } else if (activePage === 'crm') {
    content = <CRM />
  } else if (activePage === 'documents') {
    content = <Documents />
  } else if (activePage === 'profile' || activePage === 'settings') {
    content = <Profile />
  } else if (activePage === 'notifications') {
    content = <Notifications />
  } else if (activePage === 'administration') {
    content = <Administration />
  } else {
    const cfg = MODULE_CONFIGS[activePage]
    if (cfg) {
      content = (
        <ModulePlaceholder
          icon={cfg.icon}
          title={PAGE_META[activePage]?.title ?? activePage}
          description={cfg.description}
          color={cfg.color}
          stats={cfg.stats}
          features={cfg.features}
        />
      )
    } else {
      content = (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Page not found
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        groups={NAV_GROUPS}
        active={activePage}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          breadcrumbs={getBreadcrumbs(activePage)}
          onNavigate={navigate}
          isDark={isDark}
          onToggleDark={toggleDark}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background">
          {content}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ERPApp />
    </AuthProvider>
  )
}
