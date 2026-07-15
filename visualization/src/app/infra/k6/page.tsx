import { K6Experience } from '@/features/k6/k6-experience';
import { lessons, sources } from '@/content/k6';

export default function K6Page() {
  return <K6Experience lessons={lessons} sources={sources} />;
}
