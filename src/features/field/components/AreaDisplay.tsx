interface AreaDisplayProps {
  m2: number;
  sotix: number;
  hectare: number;
}

export function AreaDisplay({ m2, sotix, hectare }: AreaDisplayProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-4 justify-around">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">m²</p>
        <p className="font-bold text-green-700">{m2.toLocaleString()}</p>
      </div>
      <div className="w-px bg-green-200" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Sotix</p>
        <p className="font-bold text-green-700">{sotix}</p>
      </div>
      <div className="w-px bg-green-200" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Gektar</p>
        <p className="font-bold text-green-700">{hectare}</p>
      </div>
    </div>
  );
}
