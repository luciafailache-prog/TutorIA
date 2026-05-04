import { useState, useEffect } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
// Note: We'll use a simple manual conversion or mathjs if complex. 
// For now, let's use the provided groups logic.

const GROUPS = {
  Length: {
    label: 'Longitud',
    units: [
      { id: 'm', label: 'Metros' },
      { id: 'km', label: 'Kilómetros' },
      { id: 'cm', label: 'Centímetros' },
      { id: 'mm', label: 'Milímetros' }
    ],
    ratios: { m: 1, km: 1000, cm: 0.01, mm: 0.001 }
  },
  Weight: {
    label: 'Masa',
    units: [
      { id: 'kg', label: 'Kilogramos' },
      { id: 'g', label: 'Gramos' },
      { id: 'mg', label: 'Miligramos' }
    ],
    ratios: { kg: 1, g: 0.001, mg: 0.000001 }
  },
  Time: {
    label: 'Tiempo',
    units: [
      { id: 's', label: 'Segundos' },
      { id: 'min', label: 'Minutos' },
      { id: 'hr', label: 'Horas' }
    ],
    ratios: { s: 1, min: 60, hr: 3600 }
  }
};

export default function UnitConverter() {
  const [value, setValue] = useState<number>(1);
  const [category, setCategory] = useState<keyof typeof GROUPS>('Length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const group = GROUPS[category];
    setFromUnit(group.units[0].id);
    setToUnit(group.units[1].id);
    setResult(null);
  }, [category]);

  const convert = () => {
    const group = GROUPS[category];
    // @ts-ignore
    const baseValue = value * group.ratios[fromUnit];
    // @ts-ignore
    const res = baseValue / group.ratios[toUnit];
    setResult(Number(res.toFixed(6)));
  };

  return (
    <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm h-full flex flex-col">
      <h3 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">Conv.Units_</h3>

      <div className="space-y-6 flex-1">
        <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          {(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                category === cat ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
              )}
            >
              {GROUPS[cat].label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="relative">
             <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full bg-white border-2 border-gray-100 p-6 rounded-3xl font-black text-4xl uppercase tracking-tighter italic outline-none focus:border-brand-blue transition-all pr-20"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold uppercase tracking-widest text-[10px] pointer-events-none">VALOR_</div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 p-5 rounded-2xl font-black uppercase tracking-tighter italic outline-none appearance-none cursor-pointer text-center hover:bg-gray-100 transition-colors"
            >
              {GROUPS[category].units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
            <div className="w-10 h-10 bg-brand-blue text-white rounded-full flex items-center justify-center shrink-0">
               <ArrowRightLeft size={16} />
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 p-5 rounded-2xl font-black uppercase tracking-tighter italic outline-none appearance-none cursor-pointer text-center hover:bg-gray-100 transition-colors"
            >
              {GROUPS[category].units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>

          <button
            onClick={convert}
            className="w-full bg-brand-blue text-white font-black py-6 rounded-[2rem] uppercase tracking-[0.2em] italic shadow-xl shadow-blue-900/10 active:scale-95 transition-all text-xl"
          >
            CONVERT_NOW
          </button>

          {result !== null && (
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-black text-white p-8 rounded-[3rem] text-center border-t-8 border-brand-blue shadow-2xl"
            >
              <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2">OUTPUT_RESULT</div>
              <div className="text-4xl font-black italic tracking-tighter truncate">
                {result} <span className="text-brand-blue uppercase text-lg ml-2">{toUnit}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
