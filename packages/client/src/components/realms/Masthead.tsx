import { motion } from 'framer-motion';
import { useRealm } from './RealmProvider';
import BrandPlaque from './BrandPlaque';
import SloganRotator from './SloganRotator';
import CompassDial from './CompassDial';
import CaissonDecoration from './CaissonDecoration';
import MountainScene from './MountainScene';

/**
 * 站头 - 三种布局
 * mhA：左品牌 + 中标语 + 右时钟
 * mhB：左山景 + 中品牌 + 右标语 + 角落时钟
 * mhC：左品牌 + 中装饰（罗盘/藻井）+ 右标语
 *
 * 注：每个境都会显示一个真实的十二地支时钟（CompassDial）
 *     - r1/r11 等 deco 境将其作为主装饰
 *     - 其他境作为副装饰放在标语栏侧边
 */
export default function Masthead() {
  const { realm } = useRealm();
  const layout = realm.mh;

  return (
    <motion.section
      key={realm.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.8, 0.28, 1] }}
      className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4"
    >
      {layout === 'mhA' && <LayoutA />}
      {layout === 'mhB' && <LayoutB />}
      {layout === 'mhC' && <LayoutC />}
    </motion.section>
  );
}

function LayoutA() {
  // 左品牌 + 中标语 + 右时钟
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 items-center">
      <BrandPlaque />
      <div className="md:border-l md:border-[var(--line)] md:pl-8">
        <SloganRotator />
      </div>
      <div className="hidden md:flex justify-end">
        <CompassDial size={112} />
      </div>
    </div>
  );
}

function LayoutB() {
  // 左山景 + 中品牌 + 右标语 + 时钟嵌入
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-8 items-center">
      <div className="order-2 md:order-1">
        <MountainScene />
      </div>
      <div className="hidden md:block order-1 md:order-2">
        <BrandPlaque />
      </div>
      <div className="block md:hidden order-1 w-full">
        <BrandPlaque />
      </div>
      <div className="order-3 md:border-l md:border-[var(--line)] md:pl-8">
        <SloganRotator />
      </div>
      <div className="order-4 hidden md:flex justify-end">
        <CompassDial size={112} />
      </div>
    </div>
  );
}

function LayoutC() {
  const { realm } = useRealm();
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 items-center">
      <BrandPlaque />
      <div className="flex justify-center">
        {realm.deco === 'dial' && realm.id !== 'r1' && <CompassDial size={136} />}
        {realm.deco === 'zaojing' && <CaissonDecoration />}
        {!realm.deco && realm.id !== 'r1' && <MountainScene />}
      </div>
      <div className="md:border-l md:border-[var(--line)] md:pl-8 flex flex-col gap-4 items-start">
        <SloganRotator />
        {(realm.deco === 'zaojing' || (!realm.deco && realm.id !== 'r1')) && (
          <div className="hidden md:block">
            <CompassDial size={112} />
          </div>
        )}
      </div>
    </div>
  );
}
