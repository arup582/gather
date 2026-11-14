'use client';
import { GatherLink as Link } from './GatherLink';
import { GatherAlert } from './GatherAlert';
import { ApiError, message } from '../../api';
export function GatherError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <GatherAlert tone="error">
      <div>
        <strong>{message(error)}</strong>
        {error instanceof ApiError && Object.keys(error.fields).length > 0 && (
          <ul>
            {Object.entries(error.fields).map(([field, text]) => (
              <li key={field}>
                {field}: {text}
              </li>
            ))}
          </ul>
        )}
        {error instanceof ApiError && error.status === 401 && (
          <>
            {' '}
            <Link href="/signin">Sign in again</Link>
          </>
        )}
      </div>
    </GatherAlert>
  );
}
