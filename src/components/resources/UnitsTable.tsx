import React from 'react';

const SI_UNITS = [
  { magnitude: 'Longitud', unit: 'Metro', symbol: 'm', base: '-' },
  { magnitude: 'Masa', unit: 'Kilogramo', symbol: 'kg', base: '-' },
  { magnitude: 'Tiempo', unit: 'Segundo', symbol: 's', base: '-' },
  { magnitude: 'Corriente Eléctrica', unit: 'Amperio', symbol: 'A', base: '-' },
  { magnitude: 'Temperatura', unit: 'Kelvin', symbol: 'K', base: '-' },
  { magnitude: 'Fuerza', unit: 'Newton', symbol: 'N', base: 'kg·m/s²' },
  { magnitude: 'Presión', unit: 'Pascal', symbol: 'Pa', base: 'N/m²' },
  { magnitude: 'Energía / Trabajo', unit: 'Julio', symbol: 'J', base: 'N·m' },
  { magnitude: 'Potencia', unit: 'Vatio', symbol: 'W', base: 'J/s' },
  { magnitude: 'Frecuencia', unit: 'Hercio', symbol: 'Hz', base: '1/s' },
  { magnitude: 'Carga Eléctrica', unit: 'Culombio', symbol: 'C', base: 'A·s' },
  { magnitude: 'Potencial Eléctrico', unit: 'Voltio', symbol: 'V', base: 'W/A' },
  { magnitude: 'Resistencia', unit: 'Ohmio', symbol: 'Ω', base: 'V/A' },
];

export default function UnitsTable() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col p-10 h-full shadow-indigo-900/5">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-slate-900 text-brand-accent rounded-xl flex items-center justify-center font-black italic text-xs">SI</div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Tabla de Unidades</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Magnitud</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Unidad</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Símbolo</th>
              <th className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {SI_UNITS.map((u, idx) => (
              <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="py-4 font-bold text-xs uppercase tracking-tight text-slate-700">{u.magnitude}</td>
                <td className="py-4 font-medium text-xs text-slate-400 uppercase tracking-tighter">{u.unit}</td>
                <td className="py-4 text-center">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 text-[10px] font-black rounded-lg border border-slate-200 group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue transition-all">
                    {u.symbol}
                  </span>
                </td>
                <td className="py-4 text-right font-mono text-[10px] text-slate-400">
                  {u.base}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
