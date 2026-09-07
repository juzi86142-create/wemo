"use client";

import { normalizeQuantity } from "./quantity-control";

interface QuantityControlProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuantityControl({ value, min = 1, max = 99, disabled = false, onChange }: QuantityControlProps) {
  return <div className="quantity-control" aria-label="Quantity"><button type="button" disabled={disabled || value <= min} aria-label="Decrease quantity" onClick={() => onChange(normalizeQuantity(value - 1, min, max))}>−</button><input aria-label="Quantity" type="number" min={min} max={max} value={value} disabled={disabled} onChange={(event) => onChange(normalizeQuantity(Number(event.target.value), min, max))} /><button type="button" disabled={disabled || value >= max} aria-label="Increase quantity" onClick={() => onChange(normalizeQuantity(value + 1, min, max))}>+</button></div>;
}
