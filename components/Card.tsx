import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function Card({ title, description, children }: CardProps) {
  return (
    <div style={{ border: '1px solid #333', padding: '20px', borderRadius: '8px', margin: '10px 0' }}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}