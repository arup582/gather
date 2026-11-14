import { GatherHeading, GatherLink } from '../components/ui';
export default function NotFound() {
  return (
    <div className="empty">
      <GatherHeading level={1}>Page not found</GatherHeading>
      <GatherLink href="/">Back to Gather</GatherLink>
    </div>
  );
}
