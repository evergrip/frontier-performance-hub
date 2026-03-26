import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

export default function RankingInput({ options, value, onChange, accentColor }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      setItems(value);
    } else if (options && options.length > 0) {
      setItems([...options]);
    }
  }, [options]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
    onChange(reordered);
  };

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">Drag to reorder — #1 is most important</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="ranking">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item, index) => (
                <Draggable key={item} draggableId={item} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white transition-shadow"
                      style={{
                        ...provided.draggableProps.style,
                        borderColor: snapshot.isDragging ? (accentColor || "#ea7924") : "#e2e8f0",
                        boxShadow: snapshot.isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: accentColor || "#ea7924" }}
                      >
                        {index + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}