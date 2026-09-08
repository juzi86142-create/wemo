import { DealerActionPanel, DealerWorkspace, dealerOrders } from "../../../../features/dealer";

export default function DealerOrdersPage() {
  return <DealerWorkspace title="Every order in view." description="Filter the local B2B order history and open a clear reorder or account-support action state."><DealerActionPanel kind="orders" rows={dealerOrders} /></DealerWorkspace>;
}
