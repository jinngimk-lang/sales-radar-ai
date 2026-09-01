import type { SalesProviderActionDescriptor } from '../../contracts/sales-provider-action.contract.js'

const APOLLO_ACTIONS: readonly SalesProviderActionDescriptor[] = [
  {
    action: 'people.search',
    risk: 'READ',
    description: 'Search prospect candidates before deciding whether paid enrichment is warranted.',
  },
  {
    action: 'people.enrich',
    risk: 'CREDIT',
    consumesCredits: true,
    description: 'Enrich a qualified person after search and evidence review.',
  },
  {
    action: 'contact.search',
    risk: 'READ',
    description: 'Check existing contacts before creating a downstream record.',
  },
  {
    action: 'contact.create',
    risk: 'WRITE',
    description: 'Create an external contact only after deterministic deduplication.',
  },
  {
    action: 'email-account.list',
    risk: 'READ',
    description: 'Resolve an actual sending mailbox before sequence enrollment.',
  },
  {
    action: 'sequence.list',
    risk: 'READ',
    description: 'Inspect available outbound sequences before execution.',
  },
  {
    action: 'sequence.enroll',
    risk: 'SEND',
    description: 'Enroll a contact into a real outbound sequence.',
  },
  {
    action: 'record.delete',
    risk: 'DESTRUCTIVE',
    description: 'Destructive record deletion is blocked by the default Sales Radar policy.',
  },
]

const ZOHO_CRM_ACTIONS: readonly SalesProviderActionDescriptor[] = [
  {
    action: 'record.search',
    risk: 'READ',
    description: 'Read/search CRM records before mutation or deduplication.',
  },
  {
    action: 'record.create',
    risk: 'WRITE',
    description: 'Create a CRM record after evidence, ownership and dedupe gates.',
  },
  {
    action: 'record.update',
    risk: 'WRITE',
    description: 'Update a CRM record only through an approved mutation path.',
  },
  {
    action: 'lead.convert',
    risk: 'WRITE',
    description: 'Convert a lead only after CRM safety and explicit approval.',
  },
  {
    action: 'email.draft',
    risk: 'DRAFT',
    description: 'Prepare provider-side email content without claiming it was sent.',
  },
  {
    action: 'email.send',
    risk: 'SEND',
    description: 'Send real provider email only after explicit approval.',
  },
  {
    action: 'workflow.read',
    risk: 'READ',
    description: 'Discover workflow configuration/triggers/actions before changes.',
  },
  {
    action: 'workflow.configure',
    risk: 'WRITE',
    description: 'Create or update workflow configuration without silently activating it.',
  },
  {
    action: 'workflow.activate',
    risk: 'SEND',
    description: 'Activate externally consequential CRM workflow execution.',
  },
  {
    action: 'cadence.configure',
    risk: 'WRITE',
    description: 'Create or update cadence configuration before activation.',
  },
  {
    action: 'cadence.activate',
    risk: 'SEND',
    description: 'Activate a cadence that can cause outbound sales actions.',
  },
  {
    action: 'record.delete',
    risk: 'DESTRUCTIVE',
    description: 'Destructive CRM deletion is blocked by the default Sales Radar policy.',
  },
]

const CATALOGS: Readonly<Record<string, readonly SalesProviderActionDescriptor[]>> = {
  apollo: APOLLO_ACTIONS,
  zoho_crm: ZOHO_CRM_ACTIONS,
}

export function getSalesProviderActionCatalog(
  providerId: string,
): SalesProviderActionDescriptor[] {
  const catalog = CATALOGS[providerId]
  return catalog ? catalog.map((descriptor) => ({ ...descriptor })) : []
}
