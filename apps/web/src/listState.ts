import { domains, workflowById } from './appData';
import type { Domain, WorkflowId } from './appData';

/** Keep List URL state internally consistent before it reaches the API. */
export function normalizeListSearchParams(input: URLSearchParams) {
  const next = new URLSearchParams(input);
  const requestedDomain = next.get('domain') || '';
  const domainIsValid = domains.some((domain) => domain.id === requestedDomain);
  const requestedWorkflowId = next.get('workflow') || '';
  const requestedWorkflow = workflowById(requestedWorkflowId);

  if (requestedDomain && !domainIsValid) next.delete('domain');
  if (
    requestedWorkflowId
    && (!requestedWorkflow || (domainIsValid && requestedWorkflow.domain !== requestedDomain))
  ) {
    next.delete('workflow');
  }
  if (!next.get('domain') && requestedWorkflow) next.set('domain', requestedWorkflow.domain);
  if (next.get('groupBy') && !['building', 'work'].includes(next.get('groupBy') || '')) next.delete('groupBy');
  return next;
}

/** Build a List return URL while retaining every active filter. */
export function listReturnRoute(
  input: URLSearchParams,
  domain?: Domain,
  workflow?: WorkflowId,
) {
  const next = new URLSearchParams(input);
  if (domain) next.set('domain', domain);
  if (workflow) next.set('workflow', workflow);
  const query = next.toString();
  return `/list${query ? `?${query}` : ''}`;
}
