/** @file DragSort 拖拽排序组件（基于 @dnd-kit/core + sortable） */
import { useEffect, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { GripVertical } from 'lucide-react';

interface DragSortProps<T> {
  items: T[];
  onSort: (newOrder: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemId: (item: T) => string;
}

function SortableRow<T>({ item, index, getItemId, renderItem }: {
  item: T; index: number; getItemId: (item: T) => string; renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const id = getItemId(item);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 ${isDragging ? 'opacity-60 z-10 relative' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-[var(--line)] text-[var(--soft)] transition-colors touch-none"
        aria-label="拖动排序"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
    </div>
  );
}

export function DragSort<T>({ items, onSort, renderItem, getItemId }: DragSortProps<T>) {
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => { setOrderedItems(items); }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex(i => getItemId(i) === active.id);
    const newIndex = orderedItems.findIndex(i => getItemId(i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = [...orderedItems];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);
    setOrderedItems(newItems);
    onSort(newItems);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedItems.map(getItemId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {orderedItems.map((item, index) => (
            <SortableRow key={getItemId(item)} item={item} index={index} getItemId={getItemId} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
