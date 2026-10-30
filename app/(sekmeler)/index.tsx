import { useOturum } from '@/lib/oturum';
import { HvTalepler } from '@/components/HvTalepler';
import { MusteriAnasayfa } from '@/components/MusteriAnasayfa';

export default function Anasayfa() {
  const { mod } = useOturum();
  return mod === 'hv' ? <HvTalepler /> : <MusteriAnasayfa />;
}
