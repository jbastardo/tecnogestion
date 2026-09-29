"use client";

import { Bell, Search, UserCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 border border-border focus-within:border-primary transition-colors">
        <Search size={18} className="text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Buscar..." 
          className="bg-transparent w-full outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium">Administrador</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <UserCircle size={32} className="text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
