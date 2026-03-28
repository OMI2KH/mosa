import React from 'react';

interface Props {
  product: { name: string; price: number; description: string };
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: Props) {
  return (
    <div className="p-4 bg-white rounded-lg shadow mb-2 cursor-pointer" onClick={onClick}>
      <p className="text-lg font-bold text-primary">{product.name}</p>
      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
      <p className="text-xl font-bold text-secondary">{product.price} ETB</p>
    </div>
  );
}