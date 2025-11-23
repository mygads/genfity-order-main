/**
 * Table Number Card Component
 * 
 * @description
 * Display table number for dine-in orders
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

interface TableNumberCardProps {
  tableNumber: string;
}

export default function TableNumberCard({ tableNumber }: TableNumberCardProps) {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center border border-orange-200 dark:border-orange-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        Table Number: <span className="font-bold text-gray-900 dark:text-white">{tableNumber}</span>
      </p>
    </div>
  );
}
