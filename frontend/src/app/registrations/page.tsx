import { MyRegistrations } from '../../screens/Registrations';
import { Protected } from '../../auth';
export default function Page() {
  return (
    <Protected>
      <MyRegistrations />
    </Protected>
  );
}
