import { ManageEvents } from '../../screens/Manage';
import { Protected } from '../../auth';
export default function Page() {
  return (
    <Protected manager>
      <ManageEvents />
    </Protected>
  );
}
