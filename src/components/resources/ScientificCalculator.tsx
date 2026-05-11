import React, { useState } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ScientificCalculator() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const buttons = [
    { label: 'sin', type: 'func' }, { label: 'cos', type: 'func' }, { label: 'tan', type: 'func' }, { label: 'π', type: 'const' },
    { label: '√', type: 'func' }, { label: '^', type: 'op' }, { label: 'log', type: 'func' }, { label: 'ln', type: 'func' },
    { label: '(', type: 'op' }, { label: ')', type: 'op' }, { label: '%', type: 'op' }, { label: 'AC', type: 'clear' },
    { label: '7', type: 'num' }, { label: '8', type: 'num' }, { label: '9', type: 'num' }, { label: '÷', type: 'op' },
    { label: '4', type: 'num' }, { label: '5', type: 'num' }, { label: '6', type: 'num' }, { label: '×', type: 'op' },
    { label: '1', type: 'num' }, { label: '2', type: 'num' }, { label: '3', type: 'num' }, { label: '-', type: 'op' },
    { label: '0', type: 'num' }, { label: '.', type: 'num' }, { label: '=', type: 'eq' }, { label: '+', type: 'op' },
  ];

  const handleAction = (label: string, type: string) => {
    if (type === 'clear') {
      setDisplay('0');
      setExpression('');
      return;
    }

    if (type === 'eq') {
      try {
        // Simple evaluation logic (in a real app, use a math library like mathjs)
        let processedExp = expression
          .replace(/÷/g, '/')
          .replace(/×/g, '*')
          .replace(/π/g, 'Math.PI')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/√\(/g, 'Math.sqrt(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(');
        
        // Handle power ^ to **
        processedExp = processedExp.replace(/\^/g, '**');

        const result = eval(processedExp);
        setDisplay(Number.isFinite(result) ? result.toString() : 'Error');
        setExpression(result.toString());
      } catch (e) {
        setDisplay('Error');
      }
      return;
    }

    let newExp = expression;
    if (type === 'func') {
      newExp += label + '(';
    } else {
      newExp += label;
    }

    setExpression(newExp);
    // Rough display logic
    setDisplay(newExp);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col p-8 h-full shadow-indigo-900/5">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-slate-900 text-brand-accent rounded-xl flex items-center justify-center font-black">f(x)</div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Calculadora</h3>
      </div>

      <div className="bg-slate-950 rounded-3xl p-8 mb-6 flex flex-col items-end justify-center min-h-[140px] shadow-inner">
        <div className="text-slate-500 text-xs font-medium truncate w-full text-right mb-2 font-mono tracking-widest">{expression || 'READY_'}</div>
        <div className="text-4xl font-bold tracking-tight truncate w-full text-right font-mono text-brand-accent">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleAction(btn.label, btn.type)}
            className={cn(
              "py-4 rounded-xl font-bold text-[10px] transition-all active:scale-95 uppercase tracking-widest leading-none",
              btn.type === 'num' ? "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50" : 
              btn.type === 'op' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" :
              btn.type === 'func' ? "bg-indigo-50 text-brand-blue hover:bg-indigo-100 font-black" :
              btn.type === 'clear' ? "bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm" :
              "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
