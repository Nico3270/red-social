"use client";

import React, { useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from "chart.js";
import { Transaction } from "@/transacciones/interfaces/types";
import { subDays, startOfMonth, startOfYear, isAfter, isBefore } from "date-fns";
import {  SeccionesFont, titulosPrincipales} from "@/config/fonts";

ChartJS.register(ArcElement, Tooltip, Legend);

interface GraficosTransaccionesProps {
    transactions: Transaction[];
}

const GraficosTransacciones: React.FC<GraficosTransaccionesProps> = ({ transactions }) => {
    const [filters, setFilters] = useState({
        period: "all", // "day", "week", "month", "year", "custom"
        startDate: "",
        endDate: "",
    });

    const handleFilterChange = (period: string) => {
        const today = new Date();
        setFilters({
            period,
            startDate: period === "custom" ? filters.startDate : "",
            endDate: period === "custom" ? filters.endDate : "",
        });

        if (period === "day") {
            setFilters({ period, startDate: today.toISOString(), endDate: today.toISOString() });
        } else if (period === "week") {
            setFilters({ period, startDate: subDays(today, 7).toISOString(), endDate: today.toISOString() });
        } else if (period === "month") {
            setFilters({ period, startDate: startOfMonth(today).toISOString(), endDate: today.toISOString() });
        } else if (period === "year") {
            setFilters({ period, startDate: startOfYear(today).toISOString(), endDate: today.toISOString() });
        }
    };

    const applyFilters = () => {
        const { startDate, endDate, period } = filters;
        if (period === "all") return transactions;

        return transactions.filter((t) => {
            const transactionDate = new Date(t.date);
            if (startDate && isBefore(transactionDate, new Date(startDate))) return false;
            if (endDate && isAfter(transactionDate, new Date(endDate))) return false;
            return true;
        });
    };

    const filteredTransactions = applyFilters();

    const ingresos = filteredTransactions.filter((t) => t.type === "ingreso");
    const gastos = filteredTransactions.filter((t) => t.type === "gasto");

    const calcularDatosPorCategoria = (transacciones: Transaction[]) => {
        const categorias = [...new Set(transacciones.map((t) => t.category))];
        const datos = categorias.map((cat) =>
            transacciones.filter((t) => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
        );
        return { categorias, datos };
    };

    const ingresosPorCategoria = calcularDatosPorCategoria(ingresos);
    const gastosPorCategoria = calcularDatosPorCategoria(gastos);

    const totalIngresos = ingresos.reduce((sum, t) => sum + t.amount, 0);
    const totalGastos = gastos.reduce((sum, t) => sum + t.amount, 0);

    const balance = [
        { label: "Ingresos", value: totalIngresos },
        { label: "Gastos", value: totalGastos },
    ];

    const colores = [
        "#FC4100", "#00215E", "#D20062", "#D6589F", "#7695FF", "#B31312", "#EFECEC",
    ];

    const opcionesGrafico = {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<"pie">) => {
                        const value = context.raw as number;
                        const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                        const porcentaje = ((value / total) * 100).toFixed(2);
                        return `${context.label}: $${value.toLocaleString("es-CO")} (${porcentaje}%)`;
                    },
                },
            },
        },
    };

    const datosIngresos = {
        labels: ingresosPorCategoria.categorias.map((cat) =>
            cat.charAt(0).toUpperCase() + cat.slice(1)
        ),
        datasets: [
            {
                data: ingresosPorCategoria.datos,
                backgroundColor: colores,
                hoverBackgroundColor: colores,
            },
        ],
    };

    const datosGastos = {
        labels: gastosPorCategoria.categorias.map((cat) =>
            cat.charAt(0).toUpperCase() + cat.slice(1)
        ),
        datasets: [
            {
                data: gastosPorCategoria.datos,
                backgroundColor: colores,
                hoverBackgroundColor: colores,
            },
        ],
    };

    const datosBalance = {
        labels: balance.map((b) => b.label),
        datasets: [
            {
                data: balance.map((b) => b.value),
                backgroundColor: ["#4ECDC4", "#FF6B6B"],
                hoverBackgroundColor: ["#4ECDC4", "#FF6B6B"],
            },
        ],
    };

    return (
        <div>
            <h1 className={`text-center pb-6 text-2xl font-bold color-titulo-tarjeta ${titulosPrincipales.className}`}>Resumen de transacciones</h1>
            {/* Filtros */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-center">
                <button
                    onClick={() => handleFilterChange("day")}
                    className="bg-[#F26B0F] text-white px-4 py-2 rounded-md hover:bg-[#FCC737]"
                >
                    Día
                </button>
                <button
                    onClick={() => handleFilterChange("week")}
                    className="bg-[#F26B0F] text-white px-4 py-2 rounded-md hover:bg-[#FCC737]"
                >
                    Semana
                </button>
                <button
                    onClick={() => handleFilterChange("month")}
                    className="bg-[#F26B0F] text-white px-4 py-2 rounded-md hover:bg-[#FCC737]"
                >
                    Mes
                </button>
                <button
                    onClick={() => handleFilterChange("year")}
                    className="bg-[#F26B0F] text-white px-4 py-2 rounded-md hover:bg-[#FCC737]"
                >
                    Año
                </button>
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                        setFilters({ ...filters, period: "custom", startDate: e.target.value })
                    }
                    className="border rounded-md p-2"
                />
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                        setFilters({ ...filters, period: "custom", endDate: e.target.value })
                    }
                    className="border rounded-md p-2"
                />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Ingresos */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <h2 className={`text-2xl font-bold text-center mb-4 ${SeccionesFont.className} text-[#640D5F]`}>Ingresos</h2>
                    <Pie data={datosIngresos} options={opcionesGrafico} />
                    <div className="mt-4">
                        {ingresosPorCategoria.categorias.map((cat, index) => (
                            <p key={cat} className="text-sm">
                                <span
                                    className="inline-block w-4 h-4 rounded-full"
                                    style={{ backgroundColor: colores[index] }}
                                ></span>{" "}
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}: ${ingresosPorCategoria.datos[index].toLocaleString("es-CO")}
                            </p>
                        ))}
                        {/* Total de ingresos */}
                        <p className="text-sm font-bold mt-2">
                            Total: $
                            {ingresosPorCategoria.datos
                                .reduce((sum, value) => sum + value, 0)
                                .toLocaleString("es-CO")}
                        </p>
                    </div>

                </div>

                {/* Gastos */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <h2 className={`text-2xl font-bold text-center mb-4 ${SeccionesFont.className} text-[#640D5F]`}>Gastos</h2>
                    <Pie data={datosGastos} options={opcionesGrafico} />
                    <div className="mt-4">
                        {gastosPorCategoria.categorias.map((cat, index) => (
                            <p key={cat} className="text-sm">
                                <span
                                    className="inline-block w-4 h-4 rounded-full"
                                    style={{ backgroundColor: colores[index] }}
                                ></span>{" "}
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}: ${gastosPorCategoria.datos[index].toLocaleString("es-CO")}
                            </p>
                        ))}
                        {/* Total de gastos */}
                        <p className="text-sm font-bold mt-2">
                            Total: $
                            {gastosPorCategoria.datos
                                .reduce((sum, value) => sum + value, 0)
                                .toLocaleString("es-CO")}
                        </p>
                    </div>
                </div>

                {/* Balance */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <h2
                        className={`text-2xl font-bold text-center mb-4 ${SeccionesFont.className} text-[#640D5F]`}
                    >
                        Balance
                    </h2>
                    <Pie data={datosBalance} options={opcionesGrafico} />
                    <div className="mt-4">
                        {balance.map((b, index) => (
                            <p key={b.label} className="text-sm">
                                <span
                                    className="inline-block w-4 h-4 rounded-full"
                                    style={{
                                        backgroundColor: ["#4ECDC4", "#FF6B6B"][index],
                                    }}
                                ></span>{" "}
                                {b.label}: ${b.value.toLocaleString("es-CO")}
                            </p>
                        ))}

                        {/* Total */}
                        <p className="text-lg font-semibold mt-4">
                            Total:{" "}
                            <span
                                className={`${balance[0]?.value - balance[1]?.value >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                ${(
                                    balance[0]?.value - balance[1]?.value
                                ).toLocaleString("es-CO")}
                            </span>
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GraficosTransacciones;
