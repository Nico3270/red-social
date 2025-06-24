"use client";


import { useAddressStore } from "@/store/address/address-store";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormInputs = {
  senderName: string;
  senderPhone: string;
  recipientName?: string;
  recipientPhone: string;
  deliveryAddress: string;
  occasion?: string;
  dedicationMessage?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  additionalComments?: string;
};

export const AddressForm = () => {
  const setAddress = useAddressStore((state) => state.setAddress);
  const address = useAddressStore((state) => state.address);
  const router = useRouter();

  const {
    handleSubmit,
    register,
    formState: { isValid, errors },
    reset,
  } = useForm<FormInputs>({
    mode: "onChange",
  });

  useEffect(() => {
    if (address && address.senderName) {
      reset(address);
    }
  }, [address, reset]);

  const onSubmit = (data: FormInputs) => {
    setAddress(data);
    router.push("/checkout");
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Completa los datos de entrega
      </h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Nombre de la persona que envía */}
        <div className="mb-4">
          <label
            htmlFor="senderName"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre de la persona que envía <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            className={clsx(
              "mt-1 block w-full border rounded-lg shadow-sm p-2",
              errors.senderName ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Juan Pérez"
            {...register("senderName", { required: "Este campo es obligatorio" })}
          />
          {errors.senderName && (
            <p className="text-red-500 text-sm mt-1">{errors.senderName.message}</p>
          )}
        </div>

        {/* Teléfono de la persona que envía */}
        <div className="mb-4">
          <label
            htmlFor="senderPhone"
            className="block text-sm font-medium text-gray-700"
          >
            Teléfono de la persona que envía <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            className={clsx(
              "mt-1 block w-full border rounded-lg shadow-sm p-2",
              errors.senderPhone ? "border-red-500" : "border-gray-300"
            )}
            placeholder="300 123 4567"
            {...register("senderPhone", {
              required: "Este campo es obligatorio",
              pattern: {
                value: /^[0-9]{10}$/,
                message: "Debe tener 10 dígitos",
              },
            })}
          />
          {errors.senderPhone && (
            <p className="text-red-500 text-sm mt-1">{errors.senderPhone.message}</p>
          )}
        </div>

        {/* Nombre de la persona que recibe */}
        <div className="mb-4">
          <label
            htmlFor="recipientName"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre de la persona que recibe (Opcional)
          </label>
          <input
            type="text"
            className="mt-1 block w-full border rounded-lg shadow-sm p-2 border-gray-300"
            placeholder="María González"
            {...register("recipientName")}
          />
        </div>

        {/* Teléfono de la persona que recibe */}
        <div className="mb-4">
          <label
            htmlFor="recipientPhone"
            className="block text-sm font-medium text-gray-700"
          >
            Teléfono de la persona que recibe <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            className={clsx(
              "mt-1 block w-full border rounded-lg shadow-sm p-2",
              errors.recipientPhone ? "border-red-500" : "border-gray-300"
            )}
            placeholder="300 987 6543"
            {...register("recipientPhone", {
              required: "Este campo es obligatorio",
              pattern: {
                value: /^[0-9]{10}$/,
                message: "Debe tener 10 dígitos",
              },
            })}
          />
          {errors.recipientPhone && (
            <p className="text-red-500 text-sm mt-1">{errors.recipientPhone.message}</p>
          )}
        </div>

        {/* Dirección de entrega */}
        <div className="mb-4">
          <label
            htmlFor="deliveryAddress"
            className="block text-sm font-medium text-gray-700"
          >
            Dirección de entrega <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            className={clsx(
              "mt-1 block w-full border rounded-lg shadow-sm p-2",
              errors.deliveryAddress ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Calle 123, N° 45"
            {...register("deliveryAddress", { required: "Este campo es obligatorio" })}
          />
          {errors.deliveryAddress && (
            <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress.message}</p>
          )}
        </div>

        {/* Ocasión */}
        <div className="mb-4">
          <label
            htmlFor="occasion"
            className="block text-sm font-medium text-gray-700"
          >
            Ocasión (Opcional)
          </label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2"
            placeholder="Cumpleaños, aniversario, etc."
            {...register("occasion")}
          />
        </div>

        {/* Mensaje o dedicatoria */}
        <div className="mb-4">
          <label
            htmlFor="dedicationMessage"
            className="block text-sm font-medium text-gray-700"
          >
            Mensaje o dedicatoria (Opcional)
          </label>
          <textarea
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2"
            placeholder="Escribe un mensaje especial"
            rows={3}
            {...register("dedicationMessage")}
          />
        </div>

        {/* Fecha de entrega */}
        <div className="mb-4">
          <label
            htmlFor="deliveryDate"
            className="block text-sm font-medium text-gray-700"
          >
            Fecha de entrega (Opcional)
          </label>
          <input
            type="date"
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2"
            {...register("deliveryDate")}
          />
        </div>

        {/* Hora de entrega */}
        <div className="mb-4">
          <label
            htmlFor="deliveryTime"
            className="block text-sm font-medium text-gray-700"
          >
            Hora de entrega (Opcional)
          </label>
          <input
            type="time"
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2"
            {...register("deliveryTime")}
          />
        </div>

        {/* Comentario adicional */}
        <div className="mb-4">
          <label
            htmlFor="additionalComments"
            className="block text-sm font-medium text-gray-700"
          >
            Comentario adicional (Opcional)
          </label>
          <textarea
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2"
            placeholder="Escribe detalles adicionales sobre la entrega"
            rows={3}
            {...register("additionalComments")}
          />
        </div>

        {/* Mensaje de confirmación */}
        <p className="text-gray-600 text-sm mb-4">
          La fecha, hora, y disponibilidad de los productos y opciones será confirmada por uno de nuestros asesores en breve.
        </p>

        {/* Botón de enviar */}
        <div className="text-center">
          <button
            disabled={!isValid}
            type="submit"
            className={clsx(
              "px-6 py-2 rounded-lg font-bold text-white",
              isValid ? "bg-[#9f86c0]  hover:bg-[#e0b1cb]" : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  );
};
