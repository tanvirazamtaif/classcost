import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function ListAddView({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
  onView,
  renderItem,
  emptyMessage = "No items yet",
  addButtonText = "Add New",
  dark = false,
}) {
  const d = dark;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{title}</h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          {addButtonText}
        </motion.button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className={`text-center py-10 rounded-2xl border-2 border-dashed ${d ? 'border-surface-700 text-surface-500' : 'border-surface-200 text-surface-400'}`}>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex justify-between items-start ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-100'}`}
            >
              <div className={`flex-1 min-w-0 ${onView ? 'cursor-pointer' : ''}`} onClick={onView ? () => onView(item) : undefined}>
                {renderItem(item)}
              </div>
              <div className="flex gap-1 ml-3 shrink-0">
                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    className={`p-2 rounded-xl transition ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`}
                  >
                    <Edit2 size={15} className={d ? 'text-surface-400' : 'text-surface-500'} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className={`p-2 rounded-xl transition ${d ? 'hover:bg-danger-500/20' : 'hover:bg-danger-50'}`}
                  >
                    <Trash2 size={15} className="text-danger-500" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
