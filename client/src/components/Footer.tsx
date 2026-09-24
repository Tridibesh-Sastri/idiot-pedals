export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
           <div className="text-2xl font-black tracking-tighter text-white">
             IDIOT<span className="text-orange-500">PADEL</span>
           </div>
           <span className="text-sm font-medium text-zinc-500">Zero Pretension.</span>
        </div>
        
        <div className="flex gap-8 text-sm font-bold tracking-widest uppercase text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">Specs</a>
          <a href="#" className="hover:text-white transition-colors">Listen</a>
          <a href="#" className="hover:text-white transition-colors">Pre-order</a>
        </div>
      </div>
    </footer>
  );
}
