import { Admin } from '../../screens/Admin';
import { Protected } from '../../auth';
export default function Page() {
  return (
    <Protected admin>
      <Admin />
    </Protected>
  );
}
