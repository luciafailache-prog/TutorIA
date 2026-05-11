import React, { useState, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';

const UNIT_CATEGORIES = {
  LONGITUD: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    inch: 0.0254,
    ft: 0.3048,
    mile: 1609.34
  },
  MASA: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.453592,
    oz: 0.0283495,
    t: 1000
  },
  TIEMPO: {
    s: 1,
    min: 60,
    h: 3600,
    day: 86400,
    ms: 0.001
  },
  ENERGIA: {
    J: 1,
    cal: 4.184,
    kcal: 4184,
    kWh: 3600000,
    eV: 1.60218e-19
  }
};

export default function UnitConverter() {
  const [category, setCategory] = useState<keyof typeof UNIT_CATEGORIES>('LONGITUD');
  const [value, setValue] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [result, setResult] = useState<number>(0);

  useEffect(() => {
    const units = Object.keys(UNIT_CATEGORIES[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [category]);

  useEffect(() => {
    if (fromUnit && toUnit && UNIT_CATEGORIES[category]) {
      const fromFactor = (UNIT_CATEGORIES[category] as any)[fromUnit];
      const toFactor = (UNIT_CATEGORIES[category] as any)[toUnit];
      const val = parseFloat(value) || 0;
      setResult((val * fromFactor) / toFactor);
    }
  }, [value, fromUnit, toUnit, category]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col p-10 h-full shadow-indigo-900/5">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-blue text-brand-accent rounded-xl flex items-center justify-center font-black italic">±</div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Conversor de Unidades</h3>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(UNIT_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat as any)}
              className={`py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest border-2 transition-all ${
                category === cat ? 'bg-slate-900 text-brand-accent border-slate-900' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Input_Data</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 font-bold outline-none focus:ring-4 ring-indigo-500/5 font-mono text-slate-900"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-4 font-black uppercase outline-none min-w-[90px] text-xs transition-colors hover:bg-slate-200 cursor-pointer"
              >
                {Object.keys(UNIT_CATEGORIES[category]).map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 bg-slate-900 text-brand-accent rounded-full flex items-center justify-center shadow-lg transform active:rotate-180 transition-transform">
               <ArrowLeftRight size={16} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Output_Result</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl px-6 py-4 font-bold flex items-center text-brand-blue text-xl font-mono">
                {result.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </div>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-4 font-black uppercase outline-none min-w-[90px] text-xs transition-colors hover:bg-slate-200 cursor-pointer"
              >
                {Object.keys(UNIT_CATEGORIES[category]).map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
