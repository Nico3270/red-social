"use client";

interface QuantitySelectorProps {
  inicio: number;
  onQuantityChange: (newQuantity: number) => void;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({ inicio, onQuantityChange }) => {
  const handleQuantityChange = (newQuantity: number) => {
    const updatedQuantity = Math.max(1, newQuantity); // Evitar cantidades menores que 1
    onQuantityChange(updatedQuantity);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => handleQuantityChange(inicio - 1)} // Usamos `inicio` directamente
        className="px-3 py-1 color-boton-agregar texto-boton rounded-l-lg"
      >
        -
      </button>
      <input
        type="text"
        value={inicio} // Usamos `inicio` directamente
        readOnly
        className="w-12 text-center border border-gray-300"
      />
      <button
        onClick={() => handleQuantityChange(inicio + 1)} // Usamos `inicio` directamente
        className="px-3 py-1 color-boton-agregar texto-boton rounded-r-lg"
      >
        +
      </button>
    </div>
  );
};
