import { DealerActionPanel, DealerWorkspace, dealerQuotes } from "../../../../features/dealer";

export default function DealerQuotesPage() {
  return <DealerWorkspace title="Terms with room to play." description="Filter local quote records and use the visible action panel for acceptance, renewal, or support states."><DealerActionPanel kind="quotes" rows={dealerQuotes} /></DealerWorkspace>;
}
