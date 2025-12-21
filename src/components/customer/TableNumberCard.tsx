/**
 * Table Number Card Component - Burjo ESB Style
 * 
 * @description
 * Display table number for dine-in orders
 * Matches Burjo ESB reference:
 * - Background: #fff7ed (light beige)
 * - Padding: 12px 16px
 * - Border Radius: 16px 16px 0 0 (top corners)
 * - Font: 14px, weight 500, Inter
 * 
 * @specification Burjo ESB Reference
 */

'use client';

interface TableNumberCardProps {
  tableNumber: string;
}

export default function TableNumberCard({ tableNumber }: TableNumberCardProps) {
  return (
    <div
      className="text-center"
      style={{
        backgroundColor: '#fff7ed',
        padding: '12px 16px',
        borderRadius: '16px 16px 0 0',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <p
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#212529',
        }}
      >
        Table Number: <span style={{ fontWeight: 700 }}>{tableNumber}</span>
      </p>
    </div>
  );
}

