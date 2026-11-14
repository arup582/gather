import { GatherLink } from '../ui/GatherLink';
import { GatherMark } from './GatherMark';

export function GatherBrand() {
  return (
    <GatherLink href="/" className="gather-brand" aria-label="Gather home">
      <GatherMark />
      <span>gather.</span>
    </GatherLink>
  );
}
