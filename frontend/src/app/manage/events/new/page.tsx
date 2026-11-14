import { NewEvent } from '../../../../screens/Manage';
import { Protected } from '../../../../auth';
export default function Page() {
  return (
    <Protected manager>
      <NewEvent />
    </Protected>
  );
}
