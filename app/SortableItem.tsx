'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

export default function SortableItem({ id, onEdit, onDelete, children, renderHandle }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {/* Drag handle: only this triggers drag */}
            {renderHandle
                ? renderHandle({ setActivatorNodeRef, listeners, isDragging })
                : (
                    <div
                        ref={setActivatorNodeRef}
                        {...listeners}
                        style={{
                            cursor: 'grab',
                            position: 'absolute',
                            top: 8,
                            left: 0,
                            width: 24,
                            height: 24,
                            zIndex: 2,
                        }}
                        aria-label="Drag handle"
                    >
                    </div>
                )
            }
            {/* Main content */}
            <div style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
                {children}
            </div>
        </div>
    );
}