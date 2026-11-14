import { ManageEvent } from '../../../../screens/Manage';
import { Protected } from '../../../../auth';
export default function Page() {
  return (
    <Protected manager>
      <ManageEvent />
    </Protected>
  );
}
