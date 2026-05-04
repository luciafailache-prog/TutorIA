import { useState } from 'react';
import { create, all } from 'mathjs';
import { cn } from '../lib/utils';

const math = create(all);

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const buttons = [
    'sin', 'cos', 'tan', '(', ')', 'C',
    '7', '8', '9', '/', 'sqrt', '^',
    '4', '5', '6', '*', 'log', '!',
    '1', '2', '3', '-', 'pi', 'e',
    '0', '.', '=', '+', 'del', 'ans'
  ];

  const handleAction = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setEquation('');
    } else if (val === '=') {
      try {
        const result = math.evaluate(equation || display);
        setDisplay(String(result));
        setEquation(String(result));
      } catch (e) {
        setDisplay('Error');
      }
    } else if (val === 'del') {
      const nextEq = equation.slice(0, -1);
      setEquation(nextEq);
      setDisplay(nextEq || '0');
    } else if (val === 'ans') {
        // Just keep current display
    } else {
      const nextEq = equation === '0' ? val : equation + val;
      setEquation(nextEq);
      setDisplay(nextEq);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm h-full flex flex-col">
      <h3 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">Calc.Scientific_</h3>
      
      <div className="bg-gray-50 p-8 rounded-3xl mb-8 border border-gray-100 text-right overflow-hidden shadow-inner">
        <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest h-4 truncate">{equation}</div>
        <div className="text-5xl font-mono font-black italic tracking-tighter text-brand-blue truncate">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 flex-1 overflow-y-auto">
        {buttons.map(btn => (
          <button
            key={btn}
            onClick={() => handleAction(btn)}
            className={cn(
              "p-4 text-[10px] font-black uppercase tracking-tighter italic rounded-xl transition-all active:scale-90",
              btn === '=' 
                ? "bg-brand-blue text-white shadow-lg col-span-2 text-sm" 
                : btn === 'C' || btn === 'del'
                  ? "bg-brand-red text-white"
                  : isNaN(Number(btn)) && btn !== '.' 
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                    : "bg-white border border-gray-100 text-black hover:border-gray-300 shadow-sm"
            )}
          >
            {btn === 'pi' ? 'π' : btn === 'sqrt' ? '√' : btn}
          </button>
        ))}
      </div>
    </div>
  );
}
